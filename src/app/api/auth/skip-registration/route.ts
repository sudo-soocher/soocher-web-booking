import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";

/**
 * "Skip Registration" on the first-time profile-completion form. Deletes
 * the `Users/{uid}` doc if — and only if — it's still an incomplete stub
 * (no name/email saved yet, not a doctor account). This is the safety
 * guard: it can never delete a real, already-registered account, even if
 * called with a stale or reused token.
 *
 * Only the Firestore profile is removed, not the underlying Firebase Auth
 * (phone) user — the same number can OTP-verify again later and get a
 * clean slate, which is simpler and reversible.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization: Bearer <idToken> header" },
        { status: 401 }
      );
    }

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const ref = getAdminFirestore().collection("Users").doc(uid);
    const snap = await ref.get();

    if (snap.exists) {
      const data = snap.data() as
        | { name?: string; email?: string; type?: string }
        | undefined;
      const hasName = !!data?.name && data.name.trim().length > 0;
      const hasEmail = !!data?.email && data.email.trim().length > 0;

      if (hasName && hasEmail) {
        return NextResponse.json(
          { error: "This account is already registered." },
          { status: 409 }
        );
      }
      if (data?.type === "DOCTOR") {
        return NextResponse.json(
          { error: "Doctor accounts can't be skipped this way." },
          { status: 409 }
        );
      }

      await ref.delete();
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[skip-registration]", msg);

    if (
      msg.includes("INVALID_ID_TOKEN") ||
      msg.includes("TOKEN_EXPIRED") ||
      msg.includes("auth/id-token-expired") ||
      msg.includes("auth/argument-error")
    ) {
      return NextResponse.json(
        { error: "ID token invalid or expired" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to skip registration: " + msg },
      { status: 500 }
    );
  }
}
