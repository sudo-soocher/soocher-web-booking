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

export function markNativeSession(uid: string): void {
  try {
    localStorage.setItem(KEY, uid);
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

export function clearNativeSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do — a stale marker self-heals on the next launch
  }
}
