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

    let frame = 0;
    let lastHeight = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const nextHeight = Math.round(viewport?.height ?? window.innerHeight);

        // iOS emits several nearly identical resize/scroll values while its
        // keyboard and suggestion bar settle. Ignore sub-pixel noise so the
        // fixed chat surface is not repainted on every event.
        if (Math.abs(nextHeight - lastHeight) < 3) return;
        lastHeight = nextHeight;
        element.style.setProperty("--mobile-visual-viewport-height", `${nextHeight}px`);
      });
    };

    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      element.style.removeProperty("--mobile-visual-viewport-height");
    };
  }, [active]);

  return ref;
}
