"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/doctor/lib/firebase";

const MESSAGES = [
  "Verifying your credentials…",
  "Setting up your workspace…",
  "Loading your dashboard…",
  "Almost there…",
];

export default function NativeAuthPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const ct = new URLSearchParams(window.location.search).get("ct");
    if (!ct) { setError("No authentication token provided."); return; }
    signInWithCustomToken(auth, ct)
      .then(() => router.replace("/doc/dashboard"))
      .catch((err: { message?: string }) => setError(err?.message || "Authentication failed."));
  }, [router]);

  useEffect(() => {
    const t = setInterval(
      () => setMsgIndex((i) => (i + 1 < MESSAGES.length ? i + 1 : i)),
      2500
    );
    return () => clearInterval(t);
  }, []);

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

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-10 overflow-hidden bg-white">

      {/* Soft radial glow behind spinner */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div style={{
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(46,109,212,0.08) 0%, transparent 70%)",
        }} />
      </div>

      {/* Spinner + icon stack */}
      <div className="relative flex items-center justify-center" style={{ width: 108, height: 108 }}>

        {/* Rotating gradient ring */}
        <svg
          width="108" height="108"
          viewBox="0 0 108 108"
          fill="none"
          style={{ position: "absolute", inset: 0, animation: "spin 1.4s linear infinite" }}
        >
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2E6DD4" stopOpacity="0" />
              <stop offset="60%" stopColor="#2E6DD4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#2E6DD4" stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* Faint track */}
          <circle cx="54" cy="54" r="48" stroke="#EDF4FF" strokeWidth="5" />
          {/* Gradient arc */}
          <circle
            cx="54" cy="54" r="48"
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
            width: 72, height: 72,
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
          Soocher <span className="text-primary">for Doctors</span>
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
