"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "@/doctor/lib/firebase";
import { PageLoader } from "@/doctor/components/ui/PageLoader";
import { destinationPath, resolveDestination } from "@/lib/post-login-route";

export default function NativeAuthPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ct = new URLSearchParams(window.location.search).get("ct");
    if (!ct) { setError("No authentication token provided."); return; }

    signInWithCustomToken(auth, ct)
      .then(async ({ user }) => {
        // Resolve the real destination instead of always sending the doctor
        // to /doc/dashboard. That previously relied on AuthGuard to notice an
        // unfinished profile and bounce a second time — this loaded the
        // dashboard's data before redirecting away from it, and it silently
        // trusted every custom token as a doctor's. This is the Flutter app's
        // doctor entry point, so a non-doctor account here means the wrong
        // person reached this URL; sign them back out rather than showing
        // any doctor screen.
        const destination = await resolveDestination(user.uid);
        if (destination.kind === "patient" || destination.kind === "patient-needs-profile") {
          await signOut(auth);
          router.replace("/login?denied=1");
          return;
        }
        router.replace(destinationPath(destination) ?? "/doc/dashboard");
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
