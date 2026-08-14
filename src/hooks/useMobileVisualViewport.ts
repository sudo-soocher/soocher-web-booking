"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a full-screen mobile surface inside the part of the viewport that is
 * still visible when an on-screen keyboard is open. This is especially
 * important in iOS Safari/WKWebView, where `100dvh` can briefly continue to
 * describe the pre-keyboard viewport.
 */
export function useMobileVisualViewport<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;

    const element = ref.current;
    if (!element) return;

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        element.style.setProperty(
          "--mobile-visual-viewport-height",
          `${Math.round(viewport?.height ?? window.innerHeight)}px`
        );
        element.style.setProperty(
          "--mobile-visual-viewport-top",
          `${Math.round(viewport?.offsetTop ?? 0)}px`
        );
      });
    };

    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      element.style.removeProperty("--mobile-visual-viewport-height");
      element.style.removeProperty("--mobile-visual-viewport-top");
    };
  }, [active]);

  return ref;
}
