"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken, onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/doctor/lib/firebase";
import { PageLoader } from "@/doctor/components/ui/PageLoader";
import {
  claimDoctorAccount,
  destinationPath,
  resolveDestination,
} from "@/lib/post-login-route";
import { withTimeout } from "@/lib/with-timeout";
import {
  markNativeSession,
  readNativeSession,
  readNativeDestination,
  clearNativeSession,
} from "@/lib/native-session";

// Firestore's SDK does not time out a stalled connection on its own — see
// with-timeout.ts for what happens without this.
const AUTH_TIMEOUT_MS = 8000;

/**
 * Read the `uid` claim out of a Firebase custom token without verifying it.
 * Only used to answer "does the already-persisted session belong to the same
 * user this token is for?" — see native-auth/page.tsx for the full rationale.
 */
function uidFromCustomToken(ct: string): string | null {
  try {
    const payload = ct.split(".")[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const uid = JSON.parse(atob(padded))?.uid;
    return typeof uid === "string" ? uid : null;
  } catch {
    return null;
  }
}

/** Resolve the session Firebase restores from IndexedDB — a local read. */
function waitForPersistedUser(timeoutMs = 1500): Promise<User | null> {
  return new Promise((resolve) => {
    let settled = false;
    let unsub: (() => void) | null = null;

    const finish = (user: User | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      queueMicrotask(() => unsub?.());
      resolve(user);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    unsub = onAuthStateChanged(auth, finish, () => finish(null));
  });
}

export default function NativeAuthPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const ct = params.get("ct");

    /**
     * Resolve where a signed-in doctor account belongs and go there,
     * claiming a brand-new account as a doctor when it isn't one yet.
     * Identical decision order to the pre-fast-path version of this page —
     * only the caching around it is new.
     */
    const resolveAndGo = async (uid: string, phoneNumber: string | null) => {
      const destination = await withTimeout(
        resolveDestination(uid),
        AUTH_TIMEOUT_MS,
        "Couldn't reach the server. Check your connection and try again."
      );

      if (
        destination.kind === "doctor-dashboard" ||
        destination.kind === "doctor-onboarding"
      ) {
        const target = destinationPath(destination)!;
        markNativeSession(uid, target);
        if (cancelled) return;
        router.replace(target);
        return;
      }

      const claimed = await withTimeout(
        claimDoctorAccount(uid, phoneNumber),
        AUTH_TIMEOUT_MS,
        "Couldn't reach the server. Check your connection and try again."
      );
      if (claimed) {
        markNativeSession(uid, "/doc/onboarding");
        if (cancelled) return;
        router.replace("/doc/onboarding");
        return;
      }

      clearNativeSession();
      await signOut(auth);
      if (cancelled) return;
      router.replace("/login?denied=1");
    };

    // ── Fast path: already authenticated as a doctor on a previous launch ──
    const knownUid = readNativeSession();
    const ctUid = ct ? uidFromCustomToken(ct) : null;

    if (knownUid && (!ctUid || ctUid === knownUid)) {
      const cachedTarget = readNativeDestination() ?? "/doc/dashboard";
      router.replace(cachedTarget);

      // Detached from React so it survives this unmount.
      waitForPersistedUser(5000).then((user) => {
        if (user) {
          void resolveAndGo(user.uid, user.phoneNumber).catch(() => {});
          return;
        }
        if (!ct) {
          clearNativeSession();
          return;
        }
        withTimeout(signInWithCustomToken(auth, ct), AUTH_TIMEOUT_MS)
          .then((result) =>
            resolveAndGo(result.user.uid, result.user.phoneNumber)
          )
          .catch(() => clearNativeSession());
      });
      return;
    }

    // ── Slow path: genuine first sign-in on this device ─────────────────
    (async () => {
      const existing = await waitForPersistedUser();
      if (cancelled) return;

      if (existing && (!ctUid || ctUid === existing.uid)) {
        try {
          await resolveAndGo(existing.uid, existing.phoneNumber);
        } catch (err) {
          if (cancelled) return;
          setError((err as { message?: string })?.message || "Authentication failed.");
        }
        return;
      }

      if (!ct) {
        setError("No authentication token provided.");
        return;
      }

      try {
        const result = await withTimeout(
          signInWithCustomToken(auth, ct),
          AUTH_TIMEOUT_MS,
          "Sign-in timed out. Check your connection and try again."
        );
        if (cancelled) return;
        await resolveAndGo(result.user.uid, result.user.phoneNumber);
      } catch (err) {
        if (cancelled) return;
        clearNativeSession();
        setError((err as { message?: string })?.message || "Authentication failed.");
      }
    })();

    return () => {
      cancelled = true;
    };
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
