"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase-auth";

export interface AuthState {
  user: User | null;
  /** False until Firebase has finished restoring the persisted session. */
  ready: boolean;
}

/**
 * Reading `auth.currentUser` directly during the first render is a bug: Firebase
 * restores the persisted session asynchronously, so it is `null` on every cold
 * page load even when the user is signed in. Guards written as
 * `if (!auth.currentUser) router.push("/login")` therefore bounce signed-in
 * users out of the page they just opened.
 *
 * This hook exposes `ready` so callers can wait for the real answer before
 * redirecting, while still returning `auth.currentUser` immediately for the
 * common case where the session is already in memory (client-side navigation).
 */
export function useAuthUser(): AuthState {
  const [state, setState] = useState<AuthState>(() => ({
    user: auth.currentUser,
    // A session already in memory is authoritative — no need to wait.
    ready: auth.currentUser !== null,
  }));

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => setState({ user, ready: true }),
      () => setState({ user: null, ready: true })
    );
  }, []);

  return state;
}
