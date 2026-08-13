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

const MESSAGES = [
  "Verifying your credentials…",
  "Setting up your profile…",
  "Loading your dashboard…",
  "Almost there…",
];

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
  const [msgIndex, setMsgIndex] = useState(0);
  // "idle" renders nothing. A returning user never leaves it, so the spinner
  // never flashes on screen before the redirect — that flash is the glitch.
  const [showProgress, setShowProgress] = useState(false);

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
    setShowProgress(true);

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

  useEffect(() => {
    if (!showProgress) return;
    const t = setInterval(
      () => setMsgIndex((i) => (i + 1 < MESSAGES.length ? i + 1 : i)),
      900
    );
    return () => clearInterval(t);
  }, [showProgress]);

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

  // Returning users redirect on the first frame — painting the spinner for a
  // frame or two and tearing it down is exactly the glitch we are removing.
  if (!showProgress) return null;

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-10 overflow-hidden bg-white">
      {/* Soft radial glow behind spinner */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          style={{
            width: 340,
            height: 340,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(46,109,212,0.08) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Spinner + icon stack */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 108, height: 108 }}
      >
        {/* Rotating gradient ring */}
        <svg
          width="108"
          height="108"
          viewBox="0 0 108 108"
          fill="none"
          style={{
            position: "absolute",
            inset: 0,
            animation: "spin 1.4s linear infinite",
          }}
        >
          <defs>
            <linearGradient
              id="ringGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#2E6DD4" stopOpacity="0" />
              <stop offset="60%" stopColor="#2E6DD4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#2E6DD4" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle cx="54" cy="54" r="48" stroke="#EDF4FF" strokeWidth="5" />
          <circle
            cx="54"
            cy="54"
            r="48"
            stroke="url(#ringGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="301.59"
            strokeDashoffset="75"
          />
        </svg>

        {/* Pulsing icon in center */}
        <div
          className="flex items-center justify-center rounded-full bg-primary-50"
          style={{
            width: 72,
            height: 72,
            animation: "pulse-icon 2.4s ease-in-out infinite",
            boxShadow: "0 0 0 0 rgba(46,109,212,0.15)",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#2E6DD4">
            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
          </svg>
        </div>
      </div>

      {/* Brand + message */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-lg font-black tracking-tight text-slate-900">
          <span className="text-primary">Soocher</span>
        </p>

        <div style={{ height: 24, overflow: "hidden" }}>
          <p
            key={msgIndex}
            className="text-sm text-slate-500"
            style={{ animation: "fadeUp 0.4s ease-out" }}
          >
            {MESSAGES[msgIndex]}
          </p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: i === msgIndex ? 20 : 6,
              height: 6,
              background: i === msgIndex ? "#2E6DD4" : "#E2E8F0",
              transition: "all 0.4s ease",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-icon {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(46,109,212,0.15); }
          50%       { transform: scale(1.06); box-shadow: 0 0 0 12px rgba(46,109,212,0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}
