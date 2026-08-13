"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken, onAuthStateChanged, User } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase-auth";
import { db } from "@/lib/firebase-db";
import {
  markNativeSession,
  readNativeSession,
  clearNativeSession,
} from "@/lib/native-session";
import { HomeShimmer } from "@/components/loading/HomeShimmer";

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
    const fcmToken = params.get("fcm");

    // Warm the home-page chunk before anything else, so the transition to "/"
    // is instant rather than a fresh chunk download.
    router.prefetch("/");

    const saveFcmToken = (uid: string) => {
      // Fire-and-forget: the FCM write must never sit between the user and the app.
      if (!fcmToken) return;
      updateDoc(doc(db, "Users", uid), { fcmToken }).catch(() => {
        // non-fatal — the token is refreshed on the next launch
      });
    };

    const goHome = (uid: string, path: string) => {
      markNativeSession(uid);
      saveFcmToken(uid);
      console.info(
        `[native-auth] ready via ${path} in ${Math.round(performance.now() - startedAt)}ms`
      );
      router.replace("/");
    };

    // ── Fast path: already authenticated on a previous launch ──────────────
    // Decided synchronously from localStorage, so we redirect on the first
    // frame without waiting on Firebase, the network, or the token exchange.
    const knownUid = readNativeSession();
    const ctUid = ct ? uidFromCustomToken(ct) : null;

    if (knownUid && (!ctUid || ctUid === knownUid)) {
      console.info(
        `[native-auth] ready via already-authenticated in ${Math.round(
          performance.now() - startedAt
        )}ms`
      );
      router.replace("/");

      // Everything below happens after the user is already on the home screen,
      // and is deliberately detached from React so it survives this unmount.
      waitForPersistedUser(5000).then((user) => {
        // Normal case: Firebase restored the session we expected.
        if (user) {
          saveFcmToken(user.uid);
          return;
        }
        // The marker outlived the real session (revoked token, cleared
        // IndexedDB). Re-establish it silently with the token we were handed.
        if (!ct) {
          clearNativeSession();
          return;
        }
        signInWithCustomToken(auth, ct)
          .then((result) => saveFcmToken(result.user.uid))
          .catch(() => {
            // Token is unusable too — drop the marker so the next launch runs
            // the full flow instead of looping straight to a signed-out home.
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
        goHome(existing.uid, "restored");
        return;
      }

      if (!ct) {
        setError("No authentication token provided.");
        return;
      }

      try {
        const result = await signInWithCustomToken(auth, ct);
        if (cancelled) return;
        goHome(result.user.uid, "custom-token");
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
