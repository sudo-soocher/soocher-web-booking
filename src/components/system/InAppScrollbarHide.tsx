"use client";

import { useEffect } from "react";

/**
 * A visible scrollbar reads as "this is a webpage in a browser wrapper",
 * not a native app — the Flutter shell's own WebView renders one by
 * default just like any browser would. Real browser/PWA visitors keep
 * their normal scrollbar (this only applies inside the app, detected the
 * same way `MobileBottomNav.tsx`/`BottomNav.tsx` detect it — a token
 * appended to the in-app WebView's user agent).
 *
 * Mounted once at the root layout, so it covers both the patient and
 * doctor sites the same way `FocusScrollFix` does.
 */
export function InAppScrollbarHide() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.userAgent.includes("SoocherApp")) return;
    document.documentElement.classList.add("soocher-in-app");
  }, []);

  return null;
}
