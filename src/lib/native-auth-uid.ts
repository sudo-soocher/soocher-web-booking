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

/**
 * Persist an FCM token against the resolved (canonical) uid — never the raw
 * phone-auth uid a caller might otherwise have on hand.
 *
 * The Flutter app used to write `fcmToken` straight to Firestore from the
 * client using `FirebaseAuth.instance.currentUser.uid` — the same native
 * phone-auth uid `resolveNativeAuthUid` exists to correct. When that uid
 * didn't match the doctor's real Firestore document, the token landed on an
 * empty, unrelated doc: authenticated correctly, but silently unreachable by
 * push notifications. Routing this through the same reconciliation as sign-in
 * keeps both uses of "who is this account" from drifting apart.
 *
 * Failures are logged, not thrown — a missed FCM token registration should
 * never fail the request that carries it (typically the sign-in/token-mint
 * call itself).
 */
export async function saveFcmToken(uid: string, fcmToken: string): Promise<void> {
  try {
    await getAdminFirestore()
      .collection("Users")
      .doc(uid)
      .set({ fcmToken }, { merge: true });
  } catch (err) {
    console.error("[native-auth-token] failed to save fcmToken:", err);
  }
}
