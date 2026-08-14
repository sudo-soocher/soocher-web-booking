"use client";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase-db";

/**
 * Where a freshly authenticated user belongs.
 *
 * Login is unified: patients and doctors sign in through the same screen with
 * the same WhatsApp OTP, so the account type is only known *after* the session
 * exists. This is the single place that decision is made, so /login and the
 * native-auth handoff cannot drift apart.
 */
export type Destination =
  | { kind: "doctor-dashboard" }
  | { kind: "doctor-onboarding" }
  | { kind: "patient" }
  | { kind: "patient-needs-profile"; profile: PatientProfileFields };

export interface PatientProfileFields {
  name?: string;
  email?: string;
  phoneNumber?: string;
}

interface AccountDoc {
  type?: string;
  onboardingComplete?: boolean;
  name?: string;
  email?: string;
  phoneNumber?: string;
}

/**
 * Mark a brand-new account as a doctor.
 *
 * Needed because a unified login cannot infer intent from the phone number
 * alone — a number nobody has seen before could be either role. The /doc splash
 * sends `?as=doctor`, and both native entry points (this app's /doc/native-auth
 * and the Flutter app's own OTP handoff) call this for a first-time sign-in.
 *
 * Only claims a Firestore doc that either doesn't exist yet or is already a
 * doctor (idempotent re-claim) — never one that exists for any other reason.
 * The obvious guard, checking only for an explicit non-DOCTOR `type`, is NOT
 * enough: `/api/auth/verify-otp` writes a `{ phoneNumber }`-only doc on a
 * patient's very first OTP verify, and `type` isn't set until their first
 * profile save. In that window a patient's doc has no `type` at all, so the
 * explicit-type check would have missed it and silently converted a real
 * patient into a doctor.
 */
export async function claimDoctorAccount(uid: string): Promise<boolean> {
  const ref = doc(db, "Users", uid);
  const snap = await getDoc(ref);
  const data = (snap.exists() ? snap.data() : null) as AccountDoc | null;

  if (snap.exists() && data?.type !== "DOCTOR") return false;

  await setDoc(
    ref,
    {
      type: "DOCTOR",
      isAccountVerified: false,
      documentsSubmitted: false,
      onboardingComplete: false,
      dateOfAccountCreation: Date.now(),
      accountCreationDate: serverTimestamp(),
    },
    { merge: true }
  );
  return true;
}

export async function resolveDestination(uid: string): Promise<Destination> {
  const snap = await getDoc(doc(db, "Users", uid));
  const data = (snap.exists() ? snap.data() : null) as AccountDoc | null;

  if (data?.type === "DOCTOR") {
    // A doctor who has not finished the onboarding steps has no usable
    // dashboard yet, so send them back to where they left off.
    return data.onboardingComplete
      ? { kind: "doctor-dashboard" }
      : { kind: "doctor-onboarding" };
  }

  // Patients need name, email and phone before they can book. verify-otp writes
  // a phoneNumber-only doc on first sign-in, so "doc exists" is not enough.
  const hasName = !!data?.name && data.name.trim().length > 0;
  const hasEmail = !!data?.email && data.email.trim().length > 0;
  const hasPhone = !!data?.phoneNumber;

  if (hasName && hasEmail && hasPhone) return { kind: "patient" };

  return {
    kind: "patient-needs-profile",
    profile: {
      name: data?.name,
      email: data?.email,
      phoneNumber: data?.phoneNumber,
    },
  };
}

/** Path for the destinations that are a straight redirect. */
export function destinationPath(destination: Destination): string | null {
  switch (destination.kind) {
    case "doctor-dashboard":
      return "/doc/dashboard";
    case "doctor-onboarding":
      return "/doc/onboarding";
    case "patient":
      return "/";
    default:
      // The caller stays on /login and collects the missing profile fields.
      return null;
  }
}
