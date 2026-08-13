import { NextResponse } from "next/server";
import { createSign } from "crypto";
import { getAdminAuth } from "@/lib/firebase-admin";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

// Build a Firebase custom token JWT using Node.js crypto (RS256)
function mintCustomToken(uid: string, sa: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
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

    const serviceAccountEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
    if (!serviceAccountEnv) {
      return NextResponse.json(
        { error: "Server not configured (missing service account)" },
        { status: 500 }
      );
    }

    const sa: ServiceAccount = JSON.parse(serviceAccountEnv);

    // Verify the ID token's signature against Google's public keys before
    // minting anything.
    //
    // This previously decoded the JWT payload and trusted its `sub` claim,
    // reasoning that "the token was already verified by Firebase when the native
    // SDK issued it". The server cannot know that — it only sees bytes on the
    // wire. Anyone could POST a self-made JWT with an arbitrary `sub` and
    // receive a valid custom token for that account. The patient app closed the
    // identical hole in 7415788; this is the same fix.
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const customToken = mintCustomToken(decoded.uid, sa);

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
      return NextResponse.json({ error: "ID token invalid or expired" }, { status: 401 });
    }

    return NextResponse.json({ error: "Token minting failed: " + msg }, { status: 500 });
  }
}
