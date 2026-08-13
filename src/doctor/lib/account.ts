import {
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/doctor/lib/firebase";

const USERS_COLLECTION = "Users";

export const USERNAME_RULES = {
  min: 3,
  max: 20,
  /** lowercase letters, digits, underscores, dot — must start with a letter */
  regex: /^[a-z][a-z0-9_.]{2,19}$/,
  hint: "3–20 chars, lowercase letters, digits, underscore or dot. Must start with a letter.",
};

export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(value: string): string | null {
  const v = normaliseUsername(value);
  if (!v) return "Username is required.";
  if (v.length < USERNAME_RULES.min) return `At least ${USERNAME_RULES.min} characters.`;
  if (v.length > USERNAME_RULES.max) return `At most ${USERNAME_RULES.max} characters.`;
  if (!USERNAME_RULES.regex.test(v)) return USERNAME_RULES.hint;
  return null;
}

/**
 * Check whether a username is free. Returns true if no other user holds it.
 * Pass the current uid to exclude self from the match (defensive — shouldn't
 * normally happen since username is set-once).
 */
export async function checkUsernameAvailable(
  username: string,
  currentUid?: string
): Promise<boolean> {
  const v = normaliseUsername(username);
  const snap = await getDocs(
    query(collection(db, USERS_COLLECTION), where("username", "==", v), limit(2))
  );
  if (snap.empty) return true;
  return snap.docs.every((d) => d.id === currentUid);
}

/**
 * Set the username on the current doctor doc. Throws if it's already taken or
 * if the user already has a username (set-once invariant).
 */
export async function claimUsername(uid: string, username: string): Promise<void> {
  const v = normaliseUsername(username);
  const err = validateUsername(v);
  if (err) throw new Error(err);
  const ok = await checkUsernameAvailable(v, uid);
  if (!ok) throw new Error("This username is already taken.");
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    username: v,
    usernameSetAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export interface SignInMethods {
  hasPassword: boolean;
  hasGoogle: boolean;
  hasPhone: boolean;
  email?: string;
  phoneNumber?: string;
}

export function describeSignInMethods(user: User): SignInMethods {
  const ids = user.providerData.map((p) => p.providerId);
  return {
    hasPassword: ids.includes("password"),
    hasGoogle: ids.includes("google.com"),
    hasPhone: ids.includes("phone"),
    email: user.email || undefined,
    phoneNumber: user.phoneNumber || undefined,
  };
}

/**
 * Change the password for an email/password account. Re-authenticates first
 * with the current password (Firebase requires recent auth for password
 * updates).
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("You need to be signed in with email and password to change it.");
  }
  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

/**
 * Set a password for an account that doesn't have one yet (e.g. phone-OTP or
 * Google sign-in). Links an email/password credential to the current user.
 *
 * If the user already has an email on file, pass it (or omit and we'll use
 * `user.email`). For phone-only users with no email, the caller must supply one
 * — that email becomes the future sign-in identifier.
 */
export async function setPassword(newPassword: string, emailOverride?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("You need to be signed in.");
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const email = (emailOverride || user.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("An email is required to set a password.");
  }
  const cred = EmailAuthProvider.credential(email, newPassword);
  await linkWithCredential(user, cred);
  if (email && email !== user.email) {
    await updateDoc(doc(db, USERS_COLLECTION, user.uid), {
      email,
      updatedAt: serverTimestamp(),
    });
  }
}

/** Send a Firebase password-reset email. */
export async function sendResetEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}
