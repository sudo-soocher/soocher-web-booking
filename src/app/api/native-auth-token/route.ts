import { NextResponse } from "next/server";
import { createSign } from "crypto";
import { getAdminAuth } from "@/lib/firebase-admin";
import { resolveNativeAuthUid, saveFcmToken } from "@/lib/native-auth-uid";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function mintCustomToken(uid: string, sa: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
      iat: now,
      exp: now + 3600,
      uid,
    })
  ).toString("base64url");

  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(sa.private_key, "base64url");
  return `${header}.${payload}.${sig}`;
}

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

    // Verify the ID token signature against Google's public keys —
    // prevents forged tokens from minting custom tokens for arbitrary UIDs.
    const decoded = await getAdminAuth().verifyIdToken(idToken);

    // Reconcile a phone-auth uid against the Firestore account of record —
    // see native-auth-uid.ts for why this matters for the Flutter native OTP
    // login specifically.
    const resolved = await resolveNativeAuthUid(decoded);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 409 });
    }
    const uid = resolved.uid;

    // Optional: the Flutter app also uses this endpoint to persist the FCM
    // token it registered natively, against the SAME reconciled uid used for
    // sign-in — see saveFcmToken()'s comment for why that matters. The body
    // is optional (a plain sign-in call sends none), so a parse failure just
    // means "no FCM token this time," not an error.
    const body: { fcmToken?: unknown } = await request.json().catch(() => ({}));
    if (typeof body.fcmToken === "string" && body.fcmToken.trim()) {
      await saveFcmToken(uid, body.fcmToken.trim());
    }

    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      return NextResponse.json(
        { error: "Server not configured (missing service account)" },
        { status: 500 }
      );
    }

    const sa: ServiceAccount = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };

    const customToken = mintCustomToken(uid, sa);
    return NextResponse.json({ customToken });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[native-auth-token]", msg);

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
      { error: "Token minting failed: " + msg },
      { status: 500 }
    );
  }
}
