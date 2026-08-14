"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "@/doctor/lib/firebase";
import { PageLoader } from "@/doctor/components/ui/PageLoader";
import {
  claimDoctorAccount,
  destinationPath,
  resolveDestination,
} from "@/lib/post-login-route";
import { withTimeout } from "@/lib/with-timeout";

// Firestore's SDK does not time out a stalled connection on its own — see
// with-timeout.ts for what happens without this.
const AUTH_TIMEOUT_MS = 8000;

export default function NativeAuthPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ct = new URLSearchParams(window.location.search).get("ct");
    if (!ct) { setError("No authentication token provided."); return; }

    withTimeout(signInWithCustomToken(auth, ct), AUTH_TIMEOUT_MS, "Sign-in timed out. Check your connection and try again.")
      .then(async ({ user }) => {
        // Resolve the real destination instead of always sending the doctor
        // to /doc/dashboard. That previously relied on AuthGuard to notice an
        // unfinished profile and bounce a second time — this loaded the
        // dashboard's data before redirecting away from it, and it silently
        // trusted every custom token as a doctor's.
        const destination = await withTimeout(
          resolveDestination(user.uid),
          AUTH_TIMEOUT_MS,
          "Couldn't reach the server. Check your connection and try again."
        );
        if (destination.kind === "doctor-dashboard" || destination.kind === "doctor-onboarding") {
          router.replace(destinationPath(destination)!);
          return;
        }

        // Not yet on record as a doctor. This IS the doctor app's own entry
        // point (reached from the Flutter doctor app's native OTP login, or a
        // fresh sign-up via /login?as=doctor), so a brand-new account is
        // claimed as a doctor here rather than rejected — same rule the web
        // login's ?as=doctor path uses. claimDoctorAccount refuses to touch an
        // account that already exists for some other reason (an established
        // patient, or one mid-signup with only a phoneNumber on file yet), so
        // this cannot convert a real patient into a doctor.
        if (await withTimeout(
          claimDoctorAccount(user.uid),
          AUTH_TIMEOUT_MS,
          "Couldn't reach the server. Check your connection and try again."
        )) {
          router.replace("/doc/onboarding");
          return;
        }

        await signOut(auth);
        router.replace("/login?denied=1");
      })
      .catch((err: { message?: string }) => setError(err?.message || "Authentication failed."));
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white px-6">
        <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50">
            <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900">Sign-in failed</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </div>
          <a href="/login?as=doctor" className="mt-2 block w-full rounded-full bg-primary py-3 text-center text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-600">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return <PageLoader label="Signing in" />;
}
