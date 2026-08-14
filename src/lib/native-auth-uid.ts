import { getAdminFirestore } from "@/lib/firebase-admin";

interface DecodedTokenLike {
  uid: string;
  phone_number?: string;
}

export type ResolvedUid = { uid: string } | { error: string };

/**
 * Given a verified ID token, resolve the uid a custom token should be minted
 * for.
 *
 * Firebase's native phone-auth SDK (used by the Flutter app's OTP login)
 * creates or reuses ITS OWN canonical Auth uid for a phone number —
 * independent of whatever uid a `Users/{uid}` Firestore document was created
 * under. A doctor (or patient) who originally registered by a different
 * method — Google, email/password, or the web app's own WhatsApp-OTP flow
 * before it started doing this same reconciliation — can have their Firestore
 * profile live under a DIFFERENT uid than the one native phone auth just
 * signed them in as.
 *
 * Minting a token for `decoded.uid` unconditionally in that case signs the
 * user in as a second, empty account: authenticated, but `Users/{uid}`
 * doesn't exist, so every "who is this" check (doctor status, profile
 * completeness) sees a blank slate and a real doctor gets routed into patient
 * sign-up. This is the exact bug already fixed in `/api/auth/verify-otp` for
 * the web WhatsApp-OTP flow — same failure mode, reached here from the native
 * app's own Firebase phone-auth path instead.
 *
 * Returns `decoded.uid` unchanged when the token has no phone number, no
 * Firestore doc owns that number yet, or the owner already matches.
 */
export async function resolveNativeAuthUid(
  decoded: DecodedTokenLike
): Promise<ResolvedUid> {
  const phone = decoded.phone_number;
  if (!phone) return { uid: decoded.uid };

  const snap = await getAdminFirestore()
    .collection("Users")
    .where("phoneNumber", "==", phone)
    .limit(2)
    .get();

  if (snap.size > 1) {
    console.error(
      "[native-auth-token] Multiple Users docs share",
      phone,
      snap.docs.map((d) => d.id)
    );
    return {
      error:
        "This number is linked to more than one account. Please contact support.",
    };
  }

  if (snap.size === 1 && snap.docs[0].id !== decoded.uid) {
    return { uid: snap.docs[0].id };
  }

  return { uid: decoded.uid };
}

export interface ServiceAccountCreds {
  client_email: string;
  private_key: string;
}

/**
 * Load the service-account credentials used to hand-sign a custom token JWT.
 *
 * The two native-auth-token routes independently invented two different env
 * var conventions for this: the patient route reads split
 * `FIREBASE_ADMIN_CLIENT_EMAIL` / `FIREBASE_ADMIN_PRIVATE_KEY` vars, the
 * doctor route reads a single `FIREBASE_ADMIN_SERVICE_ACCOUNT` JSON blob.
 * Only one of those was actually set on the production deployment — this
 * showed up as every doctor sign-in from the Flutter app hitting
 * `500 "Server not configured (missing service account)"` before the request
 * ever got as far as verifying the ID token, which the native WebView then
 * displayed as a generic "no internet connection" error.
 *
 * Accepting either form here, in one place both routes call, means it no
 * longer matters which convention a given deployment happens to have
 * configured — and the two can't silently drift out of sync with each other
 * again.
 */
export function loadServiceAccountCreds(): ServiceAccountCreds | null {
  const blob = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (blob) {
    try {
      const parsed = JSON.parse(blob) as Partial<ServiceAccountCreds>;
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
        };
      }
    } catch (err) {
      console.error(
        "[native-auth-token] FIREBASE_ADMIN_SERVICE_ACCOUNT is set but not valid JSON:",
        err
      );
    }
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }

  return null;
}
