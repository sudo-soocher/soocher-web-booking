"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as fbSignOut,
  type ConfirmationResult,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { appCheckReady, auth, db } from "@/doctor/lib/firebase";

// Firestore collection — matches the backend admin panel
const USERS_COLLECTION = "Users";

/**
 * "not-a-doctor" means a Users doc exists for this uid but its `type` is not
 * DOCTOR — i.e. a patient account. That is distinct from "new" (no doc at all,
 * a genuine doctor signup), and the two must never be conflated: treating a
 * patient as "new" walks them into doctor onboarding, which rewrites their
 * account type. Both apps now share one Firebase Auth session, so a patient
 * signed into the patient app arrives at /doc already authenticated.
 */
export type DoctorStatus =
  | "new"
  | "onboarding"
  | "pending"
  | "verified"
  | "not-a-doctor";

export interface DoctorProfile {
  uid: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  isAccountVerified: boolean;
  documentsSubmitted: boolean;
  onboardingComplete: boolean;
  onboardingStep?: number;
  type?: string;
  accountCreationDate?: unknown;
  [extra: string]: unknown;
}

interface AuthContextValue {
  user: User | null;
  profile: DoctorProfile | null;
  status: DoctorStatus | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

/**
 * Read the doctor profile straight from Firestore — bypasses React state so we
 * can route based on it the instant onboarding finishes / OTP verifies, before
 * `onAuthStateChanged` has had a chance to refresh `profile` in the provider.
 */
export async function fetchDoctorProfile(uid: string): Promise<DoctorProfile | null> {
  return loadDoctorProfile(uid);
}

/** Mirror of `deriveStatus` exposed for routing decisions outside the provider. */
export function statusFromProfile(p: DoctorProfile | null): DoctorStatus {
  if (!p) return "new";
  if (!p.onboardingComplete) return "onboarding";
  if (!p.isAccountVerified) return "pending";
  return "verified";
}

interface DoctorAccount {
  profile: DoctorProfile | null;
  /** A Users doc exists for this uid, but it is not a DOCTOR. */
  foreignAccount: boolean;
}

async function loadDoctorAccount(uid: string): Promise<DoctorAccount> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return { profile: null, foreignAccount: false };

  const data = snap.data() as Record<string, unknown>;
  if (data.type !== "DOCTOR") return { profile: null, foreignAccount: true };

  return {
    profile: {
      uid,
      isAccountVerified: Boolean(data.isAccountVerified),
      documentsSubmitted: Boolean(data.documentsSubmitted),
      onboardingComplete: Boolean(data.onboardingComplete),
      ...data,
    },
    foreignAccount: false,
  };
}

async function loadDoctorProfile(uid: string): Promise<DoctorProfile | null> {
  return (await loadDoctorAccount(uid)).profile;
}

/** True when the signed-in account exists but is not a doctor. */
export async function isForeignAccount(uid: string): Promise<boolean> {
  return (await loadDoctorAccount(uid)).foreignAccount;
}

function deriveStatus(p: DoctorProfile | null, foreign: boolean): DoctorStatus | null {
  if (foreign) return "not-a-doctor";
  if (!p) return "new";
  if (!p.onboardingComplete) return "onboarding";
  if (!p.isAccountVerified) return "pending";
  return "verified";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [foreign, setForeign] = useState(false);
  const [loading, setLoading] = useState(true);
  // Monotonic load token. Every profile fetch (from onAuthStateChanged OR
  // refreshProfile) bumps this counter and remembers its own value; the result
  // is only applied if it's still the most recent fetch. Without this, the
  // OTP signup flow has a race: the auth listener fires before
  // ensureDoctorDoc() writes the doc, its read returns null, and that null
  // lands AFTER refreshProfile() has set the real profile — leaving the user
  // stuck on a PageLoader on /onboarding/[step] until they refresh.
  const profileLoadRef = useRef(0);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      const token = ++profileLoadRef.current;
      if (u) {
        try {
          const acct = await loadDoctorAccount(u.uid);
          if (token === profileLoadRef.current) {
            setProfile(acct.profile);
            setForeign(acct.foreignAccount);
          }
        } catch (e) {
          console.error("Failed to load doctor profile:", e);
          if (token === profileLoadRef.current) {
            setProfile(null);
            setForeign(false);
          }
        }
      } else {
        setProfile(null);
        setForeign(false);
      }
      setLoading(false);
    });
  }, []);

  const refreshProfile = async () => {
    // Read the uid straight from Firebase, not from the closure's `user`
    // state. The OTP-verify flow calls refreshProfile() the instant after
    // signing in, *before* React has rendered the updated user state — so
    // the closure here still sees `user === null` and would bail out,
    // leaving the new-doctor onboarding page stuck on a PageLoader until
    // a hard refresh.
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const token = ++profileLoadRef.current;
    try {
      const acct = await loadDoctorAccount(uid);
      if (token === profileLoadRef.current) {
        setProfile(acct.profile);
        setForeign(acct.foreignAccount);
      }
    } catch (e) {
      console.error("Failed to refresh doctor profile:", e);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      status: user ? deriveStatus(profile, foreign) : null,
      loading,
      signOut: async () => {
        // Tell the Flutter WebView this is a real logout before signing out
        if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).SoocherBridge) {
          (window as unknown as Record<string, { postMessage: (s: string) => void }>).SoocherBridge.postMessage(
            JSON.stringify({ type: "logout" })
          );
        }
        await fbSignOut(auth);
      },
      refreshProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, profile, foreign, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ---------- Auth helpers (called from forms) ---------- */

let pendingConfirmation: ConfirmationResult | null = null;
let pendingPhone: string | null = null;

/**
 * Build a single-use RecaptchaVerifier on a brand-new <div> appended to
 * <body>. Each call owns its own container, so there's no shared DOM and no
 * widget-ID collisions across sends. The returned `cleanup` removes both the
 * verifier and the container — call it after the SMS is dispatched (or after
 * a failure) to leave nothing behind.
 *
 * Why this shape instead of a static `<div id="recaptcha-container" />`:
 * Next's router unmounts the page that originally owned the container, but
 * `grecaptcha`'s internal widget-ID → DOM-node map still points at the gone
 * node. The next send (e.g. the resend button on /login/otp after navigating
 * from /login) then throws "reCAPTCHA client element has been removed" or
 * "reCAPTCHA has already been rendered in this element". A throwaway
 * container per send sidesteps all of that.
 */
function buildOneShotRecaptcha(): { verifier: RecaptchaVerifier; cleanup: () => void } {
  if (typeof document === "undefined") {
    throw new Error("RecaptchaVerifier can only be built in the browser.");
  }
  const container = document.createElement("div");
  container.id = `recaptcha-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  // Keep it in flow but invisible — some reCAPTCHA paths refuse to render
  // into a display:none parent.
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "0";
  container.style.height = "0";
  container.style.overflow = "hidden";
  document.body.appendChild(container);
  const verifier = new RecaptchaVerifier(auth, container.id, { size: "invisible" });
  return {
    verifier,
    cleanup: () => {
      try { verifier.clear(); } catch { /* noop */ }
      try { container.remove(); } catch { /* noop */ }
    },
  };
}

export async function sendPhoneOtp(phone: string) {
  // Wait for App Check to finish registering its provider before the SDK
  // signs the OTP request. Without this, a fast click after page load can
  // race past App Check init and Firebase Identity Toolkit rejects the call
  // as INVALID_APP_CREDENTIAL (the request goes out with no App Check token).
  await appCheckReady;
  const { verifier, cleanup } = buildOneShotRecaptcha();
  try {
    pendingConfirmation = await signInWithPhoneNumber(auth, phone, verifier);
    pendingPhone = phone;
  } finally {
    // The reCAPTCHA's job ends the moment Firebase has the ConfirmationResult.
    // Always clean up — leaving the widget around just collects stale state
    // for the next send to trip over.
    cleanup();
  }
}

export function getPendingPhone() {
  return pendingPhone;
}

export async function verifyPhoneOtp(code: string) {
  if (!pendingConfirmation) throw new Error("No OTP request in progress. Please try again.");
  const result = await pendingConfirmation.confirm(code);
  pendingConfirmation = null;
  return result.user;
}

export async function resendPhoneOtp() {
  if (!pendingPhone) throw new Error("No phone number to resend to.");
  await sendPhoneOtp(pendingPhone);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Translate a Firebase Auth error into a user-readable message.
 * Firebase wraps codes inside `.code` and also inside `.message` (as
 * "Firebase: Error (auth/<code>).") — handle both.
 */
export function friendlyAuthError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  const code =
    err?.code ??
    err?.message?.match(/\((auth\/[a-z-]+)\)/)?.[1] ??
    undefined;
  switch (code) {
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes before trying again.";
    case "auth/quota-exceeded":
      return "We've hit the SMS limit for now. Please try again later or contact support.";
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "That doesn't look like a valid phone number. Check the country code and try again.";
    case "auth/invalid-verification-code":
      return "That code isn't right. Please check and try again.";
    case "auth/code-expired":
    case "auth/session-expired":
      return "This code has expired. Please request a new one.";
    case "auth/missing-verification-code":
      return "Please enter the 6-digit code.";
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential":
      return "Verification failed. Please refresh the page and try again.";
    case "auth/operation-not-allowed":
      return "Phone sign-in is temporarily unavailable. Please contact support.";
    case "auth/network-request-failed":
      return "Network issue — check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/invalid-verification-id":
      return "Verification session expired. Please request a new code.";
    default:
      // Strip the noisy "Firebase: Error (auth/…)." prefix when we fall through
      const stripped = err?.message?.replace(/^Firebase:\s*Error\s*\((.+?)\)\.?/, "").trim();
      return stripped || err?.message || "Something went wrong. Please try again.";
  }
}

export async function signUpWithEmail(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Idempotently create OR repair the Firestore doctor doc in the Users collection.
 *
 * On a new sign-up, writes the full schema the backend admin panel expects:
 *   type: "DOCTOR", isAccountVerified, documentsSubmitted, phoneNumber, accountCreationDate
 *
 * For docs that already exist (legacy records, manual admin creation, partial
 * writes), patches any missing critical fields so the doctor shows up in the
 * right admin bucket. This is the safety net that guarantees:
 *   - admin's `where("type", "==", "DOCTOR")` query always finds them
 *   - admin's `!isAccountVerified` pending filter always matches them until verified
 */
export async function ensureDoctorDoc(user: User) {
  const ref = doc(db, USERS_COLLECTION, user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as Record<string, unknown>;

    // Refuse to rewrite somebody else's account type. This used to patch
    // `type: "DOCTOR"` onto any existing doc, so a patient who reached the
    // doctor sign-up flow — trivial now that both apps share a session and an
    // origin — would silently be converted into a doctor.
    if (data.type && data.type !== "DOCTOR") {
      throw new Error(
        "This account is already registered as a patient. Please use a different number, or sign in at the patient app."
      );
    }

    const patch: Record<string, unknown> = {};
    if (data.type !== "DOCTOR") patch.type = "DOCTOR";
    if (typeof data.isAccountVerified !== "boolean") patch.isAccountVerified = false;
    if (typeof data.onboardingComplete !== "boolean") patch.onboardingComplete = false;
    if (typeof data.documentsSubmitted !== "boolean") {
      // If they already finished onboarding, mark documents submitted.
      patch.documentsSubmitted = data.onboardingComplete === true;
    }
    if (!data.phoneNumber && user.phoneNumber) patch.phoneNumber = user.phoneNumber;
    if (!data.email && user.email) patch.email = user.email;
    // Admin sorts by numeric dateOfAccountCreation; backfill if it's missing or
    // stored as a Firestore Timestamp (which the admin can't subtract).
    if (typeof data.dateOfAccountCreation !== "number") {
      patch.dateOfAccountCreation = toMillis(data.accountCreationDate) ?? Date.now();
    }
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = serverTimestamp();
      await updateDoc(ref, patch);
    }
    return;
  }

  await setDoc(ref, {
    type: "DOCTOR",
    name: user.displayName || "",
    email: user.email || "",
    phoneNumber: user.phoneNumber || "",
    isAccountVerified: false,
    // documentsSubmitted flips to true at the end of onboarding (see submitOnboarding).
    // Until then the admin bucket is "No documents".
    documentsSubmitted: false,
    onboardingComplete: false,
    // Numeric so the admin's `(b - a)` sort puts newest first.
    dateOfAccountCreation: Date.now(),
    accountCreationDate: serverTimestamp(),
  });
}

function toMillis(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") {
    const v = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof v.toMillis === "function") return v.toMillis();
    if (typeof v.seconds === "number") {
      return v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1e6);
    }
  }
  return null;
}

/** Update a single field on the current doctor doc. */
export async function setDoctorField(uid: string, patch: Record<string, unknown>) {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check whether a phone number already exists in the Users collection.
 * - existsAsUser: registered as a non-doctor (patient)
 * - existsAsDoctor: registered as a doctor
 */
export async function checkPhoneExists(phone: string): Promise<{
  existsAsUser: boolean;
  existsAsDoctor: boolean;
}> {
  const snap = await getDocs(
    query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", phone))
  );
  let existsAsUser = false;
  let existsAsDoctor = false;
  snap.forEach((d) => {
    const data = d.data();
    if (data.type === "DOCTOR") existsAsDoctor = true;
    else existsAsUser = true;
  });
  return { existsAsUser, existsAsDoctor };
}
