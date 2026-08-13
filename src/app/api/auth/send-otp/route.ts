import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { sendWhatsAppOtp } from "@/services/whatsapp";
import { TEST_OTP_CODE, isTestOtpNumber } from "@/lib/test-otp-numbers";

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
        const docId = e164.replace(/\+/g, "");
        const ref = db.collection("phoneOtps").doc(docId);
        const now = Date.now();

        // Login is unified: doctors and patients both authenticate here and are
        // routed by account type afterwards, so the previous "this number is a
        // doctor account" rejection is gone.
        const existing = await ref.get();

        // Fast path: reject an obvious cooldown violation without a transaction.
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

        // Re-check the cooldown and write the new code atomically. The read above
        // is advisory: two requests arriving together would both pass it and both
        // send a WhatsApp message, which costs money per send. Inside the
        // transaction the loser sees the winner's `createdAt` and backs off.
        // Demo numbers get a fixed code and no outbound message. Everything
        // else — the doc write, expiry, cooldown, attempt limiting — is
        // identical to a real number, so verify-otp needs no special case.
        const isTestNumber = isTestOtpNumber(e164);
        const code = isTestNumber ? TEST_OTP_CODE : generateOtp();
        const issued = await db.runTransaction(async (tx) => {
            const fresh = await tx.get(ref);
            const data = fresh.exists
                ? (fresh.data() as { createdAt?: number } | undefined)
                : undefined;

            if (data?.createdAt && now - data.createdAt < RESEND_COOLDOWN_MS) {
                return Math.ceil((RESEND_COOLDOWN_MS - (now - data.createdAt)) / 1000);
            }

            tx.set(ref, {
                code,
                phone: e164,
                createdAt: now,
                expiresAt: now + OTP_TTL_MS,
                attempts: 0,
            });
            return null;
        });

        if (issued !== null) {
            return NextResponse.json(
                { error: `Please wait ${issued}s before requesting another code.` },
                { status: 429 }
            );
        }

        if (isTestNumber) {
            console.warn(
                ">>> [SEND-OTP] TEST NUMBER — fixed code, no WhatsApp sent:",
                e164
            );
            return NextResponse.json({ success: true, test: true });
        }

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
