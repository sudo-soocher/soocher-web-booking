"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Keeps a full-screen mobile surface inside the part of the viewport that is
 * still visible when an on-screen keyboard is open. This is especially
 * important in iOS Safari/WKWebView, where `100dvh` can briefly continue to
 * describe the pre-keyboard viewport.
 */
export function useMobileVisualViewport<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    if (!active) return;

    const element = ref.current;
    if (!element) return;

    let settleTimer = 0;
    let lastHeight = 0;
    const applyHeight = () => {
      const viewport = window.visualViewport;
      const nextHeight = Math.round(viewport?.height ?? window.innerHeight);
      if (Math.abs(nextHeight - lastHeight) < 6) return;
      lastHeight = nextHeight;
      element.style.setProperty("--mobile-visual-viewport-height", `${nextHeight}px`);
    };
    const scheduleUpdate = () => {
      window.clearTimeout(settleTimer);
      // Updating on every VisualViewport frame makes WKWebView repaint the
      // Stream list repeatedly. Commit one size after the keyboard settles.
      settleTimer = window.setTimeout(applyHeight, 140);
    };

    applyHeight();
    window.addEventListener("resize", scheduleUpdate);
    window.visualViewport?.addEventListener("resize", scheduleUpdate);

    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
      element.style.removeProperty("--mobile-visual-viewport-height");
    };
  }, [active]);

  return ref;
}
