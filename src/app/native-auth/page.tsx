"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken, onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase-auth";
import {
  markNativeSession,
  readNativeSession,
  readNativeDestination,
  clearNativeSession,
} from "@/lib/native-session";
import { destinationPath, resolveDestination } from "@/lib/post-login-route";
import { withTimeout } from "@/lib/with-timeout";
import { HomeShimmer } from "@/components/loading/HomeShimmer";

// Firestore's SDK does not time out a stalled connection on its own — see
// with-timeout.ts. Without this, a stalled connection left every call site
// below awaiting forever: the slow path never left its loading shimmer, and
// the fast/self-heal paths never cleared a stale session marker.
const AUTH_TIMEOUT_MS = 8000;

/**
 * Read the `uid` claim out of a Firebase custom token without verifying it.
 *
 * This is ONLY used to answer "does the already-persisted session belong to the
 * same user this token is for?". It never grants access on its own: a mismatch
 * falls through to signInWithCustomToken (server-verified), and a match means the
 * user is already signed in as that uid via a previously verified session.
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

/**
 * Resolve the session Firebase restores from IndexedDB. This is a local read —
 * onAuthStateChanged fires once on init with the persisted user (or null) without
 * a network roundtrip. The timeout is a safety net so a stalled init can still
 * fall back to the custom-token exchange.
 */
function waitForPersistedUser(timeoutMs = 1500): Promise<User | null> {
  return new Promise((resolve) => {
    let settled = false;
    let unsub: (() => void) | null = null;

    const finish = (user: User | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // unsub may still be unassigned if the listener fired synchronously
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
    const startedAt = performance.now();
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const ct = params.get("ct");

    // Warm the home-page chunk before anything else, so the transition to "/"
    // is instant rather than a fresh chunk download.
    router.prefetch("/");

    /**
     * Send the user to the screen their account type belongs to.
     *
     * The Flutter app performs the OTP and hands us a session, but it does not
     * know whether that account is a patient or a doctor — this is the first
     * point that can. A doctor must never land on the patient home screen:
     *   - doctor                       → rejected, see below (this is the
     *                                     patient entry point; a doctor
     *                                     landing here means the wrong login
     *                                     button was used)
     *   - patient, profile complete    → /
     *   - patient, profile incomplete  → /login (registration form)
     *
     * The `?complete=1` marker on that last case isn't read by /login itself
     * (its own onAuthStateChanged already detects the incomplete profile from
     * Firestore) — it exists purely so the Flutter WebView shell can tell this
     * apart from a real logout/auth-failure landing on /login. See
     * `_isLoginUrl`/`_isAuthFlowUrl` in the Flutter app's web_view_screen.dart.
     */
    const goToAccountHome = async (uid: string, path: string) => {
      let target = "/";
      try {
        const destination = await withTimeout(
          resolveDestination(uid),
          AUTH_TIMEOUT_MS
        );
        if (
          destination.kind === "doctor-dashboard" ||
          destination.kind === "doctor-onboarding"
        ) {
          // Same rejection the doctor entry point already gives the reverse
          // case (a patient account trying to open the doctor app) — see
          // doc/native-auth/page.tsx's claimDoctorAccount-refused branch.
          clearNativeSession();
          await signOut(auth);
          if (cancelled) return;
          router.replace("/login?denied=already-doctor");
          return;
        }
        target = destinationPath(destination) ?? "/login?complete=1";
      } catch (err) {
        console.error("[native-auth] could not resolve account type:", err);
      }

      markNativeSession(uid, target);
      if (cancelled) return;
      console.info(
        `[native-auth] ready via ${path} → ${target} in ${Math.round(
          performance.now() - startedAt
        )}ms`
      );
      router.replace(target);
    };

    // ── Fast path: already authenticated on a previous launch ──────────────
    // Decided synchronously from localStorage, so we redirect on the first
    // frame without waiting on Firebase, the network, or the token exchange.
    const knownUid = readNativeSession();
    const ctUid = ct ? uidFromCustomToken(ct) : null;

    if (knownUid && (!ctUid || ctUid === knownUid)) {
      // Cached from the last launch. Without it a returning doctor would flash
      // the patient home screen before any role lookup could finish.
      const cachedTarget = readNativeDestination() ?? "/";
      console.info(
        `[native-auth] ready via already-authenticated → ${cachedTarget} in ${Math.round(
          performance.now() - startedAt
        )}ms`
      );
      router.replace(cachedTarget);

      // Everything below happens after the user is already on the home screen,
      // and is deliberately detached from React so it survives this unmount.
      waitForPersistedUser(5000).then((user) => {
        // Normal case: Firebase restored the session we expected.
        if (user) {
          // Refresh the cached destination so a doctor who has since finished
          // onboarding lands on the dashboard next launch. The in-app guards
          // already correct a stale value on arrival, so this only affects the
          // first frame of the *next* start.
          void withTimeout(resolveDestination(user.uid), AUTH_TIMEOUT_MS)
            .then((d) => {
              // Never cache a doctor destination from the patient entry
              // point — the fast path below trusts the cache blindly, and
              // this is the one page that must reject doctor accounts, not
              // silently learn to route them onward.
              if (d.kind === "doctor-dashboard" || d.kind === "doctor-onboarding") {
                clearNativeSession();
                return;
              }
              // Must match goToAccountHome's own fallback below — an
              // incomplete profile (destinationPath returns null) has to
              // keep caching the registration route, not silently default
              // to home. Caching "/" here overwrote a correct
              // "/login?complete=1" and let a relaunch skip straight past
              // an unfinished signup with no name/email ever saved.
              markNativeSession(user.uid, destinationPath(d) ?? "/login?complete=1");
            })
            .catch(() => {});
          return;
        }
        // The marker outlived the real session (revoked token, cleared
        // IndexedDB). Re-establish it silently with the token we were handed.
        if (!ct) {
          clearNativeSession();
          return;
        }
        withTimeout(signInWithCustomToken(auth, ct), AUTH_TIMEOUT_MS)
          .then((result) => void goToAccountHome(result.user.uid, "self-heal"))
          .catch(() => {
            // Token is unusable too (or the attempt timed out) — drop the
            // marker so the next launch runs the full flow instead of looping
            // straight to a signed-out home.
            clearNativeSession();
          });
      });
      return;
    }

    // ── Slow path: genuine first sign-in on this device ────────────────────
    (async () => {
      const existing = await waitForPersistedUser();
      if (cancelled) return;

      // Firebase had a session we simply had no marker for (e.g. first launch
      // after this build shipped). Still no reason to re-authenticate.
      if (existing && (!ctUid || ctUid === existing.uid)) {
        void goToAccountHome(existing.uid, "restored");
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
        void goToAccountHome(result.user.uid, "custom-token");
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
            <svg
              className="h-6 w-6 text-rose-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900">Sign-in failed</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-2 block w-full rounded-full bg-primary py-3 text-center text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-600"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <HomeShimmer />;
}
