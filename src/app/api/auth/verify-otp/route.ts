import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";

const MAX_ATTEMPTS = 5;

function normalizeE164(phone: string): string | null {
    const cleaned = phone.replace(/[\s\-()]/g, "");
    if (!cleaned.startsWith("+")) return null;
    const digits = cleaned.slice(1);
    if (!/^\d{8,15}$/.test(digits)) return null;
    return `+${digits}`;
}

export async function POST(request: Request) {
    try {
        const { phone, code } = await request.json();
        const e164 = typeof phone === "string" ? normalizeE164(phone) : null;
        const normalizedCode = typeof code === "string" ? code.trim() : "";

        if (!e164) {
            return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
        }
        if (!/^\d{6}$/.test(normalizedCode)) {
            return NextResponse.json({ error: "Code must be 6 digits" }, { status: 400 });
        }

        const db = getAdminFirestore();
        const docId = e164.replace(/\+/g, "");
        const ref = db.collection("phoneOtps").doc(docId);

        // Read the code, check it, and burn an attempt as one atomic unit.
        //
        // This was previously read → compare → `update({ attempts: n + 1 })`. Any
        // number of concurrent guesses all read the same `attempts`, all passed
        // the MAX_ATTEMPTS gate, and all wrote back the same incremented value —
        // so firing guesses in parallel bypassed the five-attempt limit almost
        // entirely. Inside a transaction the reads serialise and the counter is
        // accurate.
        const verdict = await db.runTransaction(async (tx) => {
            const fresh = await tx.get(ref);
            if (!fresh.exists) return { kind: "missing" } as const;

            const data = fresh.data() as {
                code: string;
                expiresAt: number;
                attempts: number;
            };

            if (Date.now() > data.expiresAt) {
                tx.delete(ref);
                return { kind: "expired" } as const;
            }
            if (data.attempts >= MAX_ATTEMPTS) {
                tx.delete(ref);
                return { kind: "locked" } as const;
            }
            if (data.code !== normalizedCode) {
                const attempts = data.attempts + 1;
                tx.update(ref, { attempts });
                return { kind: "mismatch", remaining: MAX_ATTEMPTS - attempts } as const;
            }
            return { kind: "ok" } as const;
        });

        if (verdict.kind === "missing") {
            console.warn(">>> [VERIFY-OTP] No OTP doc for", e164);
            return NextResponse.json(
                { error: "No code requested for this number. Please request a new one." },
                { status: 400 }
            );
        }
        if (verdict.kind === "expired") {
            return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 400 });
        }
        if (verdict.kind === "locked") {
            return NextResponse.json({ error: "Too many attempts. Please request a new code." }, { status: 429 });
        }
        if (verdict.kind === "mismatch") {
            const { remaining } = verdict;
            console.warn(">>> [VERIFY-OTP] Code mismatch for", e164, "remaining:", remaining);
            return NextResponse.json(
                { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` },
                { status: 400 }
            );
        }

        // Login is unified: doctors authenticate through this same route and the
        // client routes them by account type once signed in.
        //
        // The Firestore doc is the account of record. The caller has just proven
        // control of this phone via OTP, so if a Users doc owns the number we
        // sign them in as THAT uid.
        //
        // This previously compared the Firestore uid against
        // `getUserByPhoneNumber()` and rejected any mismatch. A doctor who signed
        // up with Google or email/password has an Auth uid with no phone attached,
        // so the lookup threw, `createUser()` minted a brand-new uid, and the
        // comparison failed — a registered doctor was told "This number is already
        // registered to another account" and could never log in. It also left an
        // orphan Auth user behind on every attempt, because createUser ran before
        // the check.
        //
        const adminAuth = getAdminAuth();
        const [ownersSnap, authPhoneUser] = await Promise.all([
            db
                .collection("Users")
                .where("phoneNumber", "==", e164)
                .limit(10)
                .get(),
            adminAuth.getUserByPhoneNumber(e164).catch(() => null),
        ]);
        let uid: string;

        if (ownersSnap.size > 1) {
            const establishedOwners = ownersSnap.docs.filter((owner) => {
                const type = owner.data().type;
                return type === "PATIENT" || type === "DOCTOR";
            });
            const authOwner = authPhoneUser
                ? ownersSnap.docs.find((owner) => owner.id === authPhoneUser.uid)
                : undefined;

            // Old login flows could leave incomplete phone-only/profile-only
            // documents behind. They are not separate accounts when one typed
            // Users profile is also the Firebase Auth record that owns the
            // verified phone. Prefer that canonical UID and leave cleanup to an
            // explicit migration instead of blocking a legitimate login.
            if (
                authOwner &&
                establishedOwners.length === 1 &&
                establishedOwners[0].id === authOwner.id
            ) {
                uid = authOwner.id;
                console.warn(
                    ">>> [VERIFY-OTP] Ignoring incomplete duplicate Users docs for",
                    e164,
                    ownersSnap.docs.filter((owner) => owner.id !== uid).map((owner) => owner.id)
                );
            } else {
                console.error(
                    ">>> [VERIFY-OTP] Conflicting Users docs share",
                    e164,
                    ownersSnap.docs.map((owner) => ({ id: owner.id, type: owner.data().type ?? null }))
                );
                return NextResponse.json(
                    { error: "This number is linked to more than one active account. Please contact support." },
                    { status: 409 }
                );
            }
        } else if (ownersSnap.size === 1) {
            uid = ownersSnap.docs[0].id;
            // Attach the phone to the Auth record so future lookups line up.
            // Best-effort: it fails harmlessly if another Auth user holds it.
            await adminAuth
                .updateUser(uid, { phoneNumber: e164 })
                .catch(() => adminAuth.createUser({ uid, phoneNumber: e164 }).catch(() => {}));
        } else {
            // Nobody owns this number yet — normal first-time sign-up.
            uid = authPhoneUser?.uid ?? (await adminAuth.createUser({ phoneNumber: e164 })).uid;
        }

        try {
            await db
                .collection("Users")
                .doc(uid)
                .set({ phoneNumber: e164 }, { merge: true });
        } catch (err) {
            console.error(">>> [VERIFY-OTP] Failed to sync phoneNumber:", err);
        }

        const customToken = await adminAuth.createCustomToken(uid);
        await ref.delete().catch(() => {});

        console.log(">>> [VERIFY-OTP] Success for", e164, "uid:", uid);
        return NextResponse.json({ token: customToken, uid });
    } catch (err) {
        console.error(">>> [VERIFY-OTP ERROR]", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
