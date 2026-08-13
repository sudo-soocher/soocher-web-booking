"use client";

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase-db";

export interface UserProfileFields {
  name?: string;
  email?: string;
  phoneNumber?: string;
  [key: string]: unknown;
}

/**
 * In-flight de-duplication for `Users/{uid}` reads.
 *
 * Signing in triggers two independent readers of the same document: the
 * `onAuthStateChanged` handler on the login page, and `routeAfterAuth` in the
 * sign-in callback. Both fire within the same tick, so the app paid for two
 * identical billed reads on every single login.
 *
 * This shares the request while it is outstanding and then forgets it — there is
 * no TTL, so a genuinely later read still goes to the server and nothing can go
 * stale.
 */
const inflight = new Map<string, Promise<UserProfileFields | null>>();

export function fetchUserProfile(
  uid: string
): Promise<UserProfileFields | null> {
  const pending = inflight.get(uid);
  if (pending) return pending;

  const request = getDoc(doc(db, "Users", uid))
    .then((snap) => (snap.exists() ? (snap.data() as UserProfileFields) : null))
    .finally(() => inflight.delete(uid));

  inflight.set(uid, request);
  return request;
}
