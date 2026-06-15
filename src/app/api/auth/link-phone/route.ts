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
        const snap = await ref.get();

        if (!snap.exists) {
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

        // Block if the phone is already saved under a different patient UID
        const existingUserSnap = await db.collection("Users")
            .where("phoneNumber", "==", e164)
            .limit(1)
            .get();
        if (!existingUserSnap.empty && existingUserSnap.docs[0].id !== decoded.uid) {
            return NextResponse.json(
                { error: "This number is already registered to another account." },
                { status: 409 }
            );
        }

        // Block if another Firebase Auth user already has this phone
        try {
            const existing = await adminAuth.getUserByPhoneNumber(e164);
            if (existing.uid !== decoded.uid) {
                return NextResponse.json(
                    { error: "This number is already linked to another account." },
                    { status: 409 }
                );
            }
        } catch {
            // Not found in Firebase Auth = available, proceed
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
