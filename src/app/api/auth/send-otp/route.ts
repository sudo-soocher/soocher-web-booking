import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { sendWhatsAppOtp } from "@/services/whatsapp";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds between sends

function normalizeE164(phone: string): string | null {
    const cleaned = phone.replace(/[\s\-()]/g, "");
    if (!cleaned.startsWith("+")) return null;
    const digits = cleaned.slice(1);
    if (!/^\d{8,15}$/.test(digits)) return null;
    return `+${digits}`;
}

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
    try {
        const { phone } = await request.json();
        const e164 = typeof phone === "string" ? normalizeE164(phone) : null;
        if (!e164) {
            return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
        }

        const db = getAdminFirestore();

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

        const docId = e164.replace(/\+/g, "");
        const ref = db.collection("phoneOtps").doc(docId);
        const now = Date.now();

        const existing = await ref.get();
        if (existing.exists) {
            const data = existing.data() as { createdAt?: number } | undefined;
            if (data?.createdAt && now - data.createdAt < RESEND_COOLDOWN_MS) {
                const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - data.createdAt)) / 1000);
                return NextResponse.json(
                    { error: `Please wait ${wait}s before requesting another code.` },
                    { status: 429 }
                );
            }
        }

        const code = generateOtp();
        await ref.set({
            code,
            phone: e164,
            createdAt: now,
            expiresAt: now + OTP_TTL_MS,
            attempts: 0,
        });

        const result = await sendWhatsAppOtp(e164, code);
        if (!result.success) {
            await ref.delete().catch(() => {});
            return NextResponse.json(
                { error: result.error || "Failed to send OTP via WhatsApp" },
                { status: 502 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(">>> [SEND-OTP ERROR]", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
