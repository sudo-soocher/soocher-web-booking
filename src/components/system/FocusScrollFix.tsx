"use client";

import { useEffect } from "react";

/**
 * App-wide baseline: keep the focused field visible above the on-screen
 * keyboard. Mounted once at the root layout, so it covers both the patient
 * and doctor sites without every page needing its own version.
 *
 * A handful of pages (chat, doctor onboarding, the prescription builder)
 * already have their own more precise version that also accounts for a
 * sticky header or a fixed CTA bar this generic one doesn't know about —
 * those keep owning their own correction; this is just the fallback for
 * every other page, including outside the Flutter WebView shell (which
 * additionally injects the equivalent of this directly into the page, so
 * the fix applies even before this component's own JS has loaded).
 */
export function FocusScrollFix() {
  useEffect(() => {
    const isEditable = (el: Element | null): el is HTMLElement =>
      !!el && el.matches("input, textarea, select, [contenteditable='true']");

    const nearestScrollable = (el: HTMLElement): Element => {
      let node = el.parentElement;
      while (node && node !== document.body && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          node.scrollHeight > node.clientHeight + 1
        ) {
          return node;
        }
        node = node.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    };

    const revealField = (el: HTMLElement) => {
      const container = nearestScrollable(el);
      const viewport = window.visualViewport;
      const fieldRect = el.getBoundingClientRect();
      const visibleTop = viewport ? viewport.offsetTop : 0;
      const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const margin = 16;

      if (fieldRect.top >= visibleTop + margin && fieldRect.bottom <= visibleBottom - margin) return;

      const targetTop = visibleTop + (visibleBottom - visibleTop) * 0.35;
      const delta = fieldRect.top - targetTop;
      const isDocument =
        container === document.scrollingElement ||
        container === document.documentElement ||
        container === document.body;

      if (isDocument) {
        window.scrollBy({ top: delta, behavior: "smooth" });
      } else {
        container.scrollBy({ top: delta, behavior: "smooth" });
      }
    };

    let settleTimer: number | undefined;
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !isEditable(target)) return;
      window.clearTimeout(settleTimer);
      revealField(target);
      settleTimer = window.setTimeout(() => revealField(target), 360);
    };

    const handleViewportChange = () => {
      const active = document.activeElement;
      if (!isEditable(active)) return;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => revealField(active), 80);
    };

    document.addEventListener("focusin", handleFocusIn, true);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    return () => {
      window.clearTimeout(settleTimer);
      document.removeEventListener("focusin", handleFocusIn, true);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  return null;
}
