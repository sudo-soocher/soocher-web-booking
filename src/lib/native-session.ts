"use client";

/**
 * A synchronous mirror of "this WebView already has a Firebase session".
 *
 * Firebase persists the real session in IndexedDB, which can only be read
 * asynchronously — so a cold launch has to wait for onAuthStateChanged before it
 * knows whether the user is signed in. localStorage is readable during the very
 * first render, which lets an already-authenticated relaunch skip the auth
 * handshake entirely and go straight to the app.
 *
 * This is a routing hint, never an authorisation check: it only ever decides
 * "can we skip re-authenticating?", and the real session is still what gates
 * every Firestore read and write.
 */

const KEY = "soocher_session_uid";
const DEST_KEY = "soocher_session_dest";

export function markNativeSession(uid: string, destination?: string): void {
  try {
    localStorage.setItem(KEY, uid);
    if (destination) localStorage.setItem(DEST_KEY, destination);
  } catch {
    // localStorage may be blocked — callers fall back to the full auth flow
  }
}

export function readNativeSession(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Where this account landed last time — "/" for a patient, "/doc/dashboard" or
 * "/doc/onboarding" for a doctor.
 *
 * The relaunch fast path has to redirect on the first frame, before Firebase has
 * restored the session, so it cannot read `Users/{uid}.type` in time. Caching the
 * previous destination keeps that path instant while still landing a doctor in
 * the doctor app instead of the patient home screen.
 *
 * It is only a hint. If it is stale — a doctor who finished onboarding since the
 * last launch — the doctor guards correct it on arrival, and the value is
 * refreshed in the background for the next launch.
 */
export function readNativeDestination(): string | null {
  try {
    return localStorage.getItem(DEST_KEY);
  } catch {
    return null;
  }
}

export function clearNativeSession(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(DEST_KEY);
  } catch {
    // nothing to do — a stale marker self-heals on the next launch
  }
}
