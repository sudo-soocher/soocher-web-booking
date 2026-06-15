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
        const snap = await ref.get();

        if (!snap.exists) {
            console.warn(">>> [VERIFY-OTP] No OTP doc for", e164);
            return NextResponse.json(
                { error: "No code requested for this number. Please request a new one." },
                { status: 400 }
            );
        }

        const data = snap.data() as { code: string; expiresAt: number; attempts: number };

        if (Date.now() > data.expiresAt) {
            await ref.delete().catch(() => {});
            return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 400 });
        }
        if (data.attempts >= MAX_ATTEMPTS) {
            await ref.delete().catch(() => {});
            return NextResponse.json({ error: "Too many attempts. Please request a new code." }, { status: 429 });
        }
        if (data.code !== normalizedCode) {
            await ref.update({ attempts: data.attempts + 1 });
            const remaining = MAX_ATTEMPTS - (data.attempts + 1);
            console.warn(">>> [VERIFY-OTP] Code mismatch for", e164, "remaining:", remaining);
            return NextResponse.json(
                { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` },
                { status: 400 }
            );
        }

        // Block if this number belongs to a doctor account
        const doctorSnap = await db.collection("Doctors")
            .where("whatsappNumber", "==", e164)
            .limit(1)
            .get();
        if (!doctorSnap.empty) {
            return NextResponse.json(
                { error: "This number is registered as a doctor account. Please use the Soocher Doctor app." },
                { status: 409 }
            );
        }

        const adminAuth = getAdminAuth();
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByPhoneNumber(e164);
        } catch {
            userRecord = await adminAuth.createUser({ phoneNumber: e164 });
        }

        // Block if the phone is already saved under a different patient UID
        const existingUserSnap = await db.collection("Users")
            .where("phoneNumber", "==", e164)
            .limit(1)
            .get();
        if (!existingUserSnap.empty && existingUserSnap.docs[0].id !== userRecord.uid) {
            return NextResponse.json(
                { error: "This number is already registered to another account." },
                { status: 409 }
            );
        }

        try {
            await db
                .collection("Users")
                .doc(userRecord.uid)
                .set({ phoneNumber: e164 }, { merge: true });
        } catch (err) {
            console.error(">>> [VERIFY-OTP] Failed to sync phoneNumber:", err);
        }

        const customToken = await adminAuth.createCustomToken(userRecord.uid);
        await ref.delete().catch(() => {});

        console.log(">>> [VERIFY-OTP] Success for", e164, "uid:", userRecord.uid);
        return NextResponse.json({ token: customToken, uid: userRecord.uid });
    } catch (err) {
        console.error(">>> [VERIFY-OTP ERROR]", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
