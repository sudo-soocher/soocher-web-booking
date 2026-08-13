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
        const authHeader = request.headers.get("Authorization") || "";
        const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!idToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { phone, code } = await request.json();
        const e164 = typeof phone === "string" ? normalizeE164(phone) : null;
        const normalizedCode = typeof code === "string" ? code.trim() : "";

        if (!e164) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
        if (!/^\d{6}$/.test(normalizedCode)) {
            return NextResponse.json({ error: "Code must be 6 digits" }, { status: 400 });
        }

        const adminAuth = getAdminAuth();
        const decoded = await adminAuth.verifyIdToken(idToken).catch(() => null);
        if (!decoded) return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });

        const db = getAdminFirestore();
        const docId = e164.replace(/\+/g, "");
        const ref = db.collection("phoneOtps").doc(docId);

        // Atomic check-and-burn: see the matching comment in verify-otp. Without
        // the transaction, parallel guesses all read the same `attempts` value and
        // the five-attempt limit could be bypassed.
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
            return NextResponse.json(
                { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` },
                { status: 400 }
            );
        }

        // All three are independent reads with no side effects, so they run
        // concurrently instead of as three sequential round trips. The error
        // precedence below is unchanged.
        const [doctorSnap, existingUserSnap, existingAuthUser] = await Promise.all([
            db.collection("Doctors").where("whatsappNumber", "==", e164).limit(1).get(),
            db.collection("Users").where("phoneNumber", "==", e164).limit(1).get(),
            adminAuth.getUserByPhoneNumber(e164).catch(() => null),
        ]);

        // Block if this number belongs to a doctor account
        if (!doctorSnap.empty) {
            return NextResponse.json(
                { error: "This number is registered as a doctor account. Please use the Soocher Doctor app." },
                { status: 409 }
            );
        }

        // Block if the phone is already saved under a different patient UID
        if (!existingUserSnap.empty && existingUserSnap.docs[0].id !== decoded.uid) {
            return NextResponse.json(
                { error: "This number is already registered to another account." },
                { status: 409 }
            );
        }

        // Block if another Firebase Auth user already has this phone
        if (existingAuthUser && existingAuthUser.uid !== decoded.uid) {
            return NextResponse.json(
                { error: "This number is already linked to another account." },
                { status: 409 }
            );
        }

        await adminAuth.updateUser(decoded.uid, { phoneNumber: e164 });
        await db
            .collection("Users")
            .doc(decoded.uid)
            .set({ phoneNumber: e164 }, { merge: true });
        await ref.delete().catch(() => {});

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(">>> [LINK-PHONE ERROR]", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
