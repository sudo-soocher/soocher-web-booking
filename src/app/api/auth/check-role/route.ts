import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

function normalizeE164(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (!cleaned.startsWith("+")) return null;
  const digits = cleaned.slice(1);
  if (!/^\d{8,15}$/.test(digits)) return null;
  return `+${digits}`;
}

/**
 * Look up the account type already registered for a phone number, before any
 * OTP is sent.
 *
 * The Flutter app's login screen asks the user to pick Patient or Doctor
 * before entering a number — this lets it reject a mismatch (e.g. a patient
 * number submitted on the doctor login) immediately on submit, instead of
 * spending an OTP send and only discovering the mismatch after the user
 * verifies the code. Returns `type: null` for a brand-new number (or one
 * whose account hasn't picked a role yet) — the caller treats that as "no
 * conflict, proceed."
 */
export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    const e164 = typeof phone === "string" ? normalizeE164(phone) : null;
    if (!e164) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const snap = await getAdminFirestore()
      .collection("Users")
      .where("phoneNumber", "==", e164)
      .limit(2)
      .get();

    if (snap.empty) {
      return NextResponse.json({ type: null });
    }

    // Ambiguous (shouldn't happen — see native-auth-uid.ts's own guard for
    // this) — don't block sign-in on it, let the post-auth reconciliation
    // there handle it same as it already does for the native token flow.
    if (snap.size > 1) {
      return NextResponse.json({ type: null });
    }

    const type = snap.docs[0].data()?.type;
    return NextResponse.json({
      type: type === "DOCTOR" || type === "PATIENT" ? type : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[check-role]", msg);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
