"use client";

import React, { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/doctor/lib/auth";
import { ProgressHeader } from "@/doctor/components/onboarding/shell";
import { PageLoader } from "@/doctor/components/ui/PageLoader";
import { useMobileVisualViewport } from "@/hooks/useMobileVisualViewport";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user, status, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // The revealFocusedField effect below already compensates for the
  // keyboard when computing where to scroll to, but that only adjusts
  // scroll position — the outer h-[100dvh] container's actual rendered
  // height never shrinks (WKWebView can keep reporting the pre-keyboard
  // 100dvh), so the CTA bar and lower content can end up sitting behind the
  // keyboard rather than above it. Same fix already used for /login and the
  // chat viewport.
  const viewportRef = useMobileVisualViewport<HTMLDivElement>(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?as=doctor");
      return;
    }
    // Onboarding is the one flow that legitimately runs with no doctor profile
    // yet, so it needs its own check: a signed-in patient must not be able to
    // walk through it and have their account rewritten to type DOCTOR.
    if (status === "not-a-doctor") {
      void signOut().finally(() => router.replace("/login?denied=1"));
      return;
    }
    if (status === "pending" || status === "verified") {
      if (pathname !== "/doc/onboarding/submitted") {
        router.replace("/doc/dashboard");
      }
    }
  }, [user, status, loading, pathname, router, signOut]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let focusTimer: number | undefined;
    const isEditableTarget = (element: HTMLElement) =>
      element.matches(
        "input, textarea, select, [contenteditable='true'], [role='combobox'], button[data-slot='trigger']"
      );

    const revealFocusedField = (element: HTMLElement, behavior: ScrollBehavior = "smooth") => {
      const field = element.closest<HTMLElement>("[data-onboarding-field]") ?? element;
      const viewport = window.visualViewport;
      const containerRect = scrollContainer.getBoundingClientRect();
      const fieldRect = field.getBoundingClientRect();
      const ctaHeight = document.querySelector<HTMLElement>(".doctor-onboarding-cta")?.offsetHeight ?? 88;
      const visualBottom = viewport
        ? Math.min(containerRect.bottom, viewport.offsetTop + viewport.height)
        : containerRect.bottom;
      const visibleTop = containerRect.top + 14;
      const visibleBottom = visualBottom - ctaHeight - 14;

      if (fieldRect.top < visibleTop || fieldRect.bottom > visibleBottom) {
        const availableHeight = Math.max(80, visibleBottom - visibleTop);
        const targetTop = visibleTop + Math.max(8, (availableHeight - fieldRect.height) / 2);
        scrollContainer.scrollBy({
          top: fieldRect.top - targetTop,
          behavior,
        });
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !isEditableTarget(target)) return;
      window.clearTimeout(focusTimer);
      // Android/iOS keyboards animate after focus. Re-check after the visual
      // viewport settles, otherwise the pre-keyboard geometry is used.
      revealFocusedField(target);
      focusTimer = window.setTimeout(() => revealFocusedField(target), 360);
    };

    const handleViewportChange = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && isEditableTarget(active)) {
        window.clearTimeout(focusTimer);
        focusTimer = window.setTimeout(() => revealFocusedField(active), 80);
      }
    };

    scrollContainer.addEventListener("focusin", handleFocusIn);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    return () => {
      window.clearTimeout(focusTimer);
      scrollContainer.removeEventListener("focusin", handleFocusIn);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, [pathname]);

  if (loading || !user || status === "not-a-doctor") {
    return <PageLoader />;
  }

  // Extract the step slug from the path, e.g. /onboarding/basic → "basic"
  const slug = pathname.split("/doc/onboarding/")[1]?.split("/")[0] ?? "";
  const showHeader = !!slug && slug !== "submitted";

  return (
    // Outer div locks viewport height and clips overscroll on mobile.
    // flex-col makes the header a natural in-flow sibling of the scroll
    // container so no padding-top calculation is needed in the content.
    <div
      ref={viewportRef}
      className="doctor-onboarding-viewport flex h-[100dvh] flex-col overflow-hidden bg-[#F8FAFC] lg:h-auto lg:min-h-[100dvh] lg:overflow-visible"
    >
      {showHeader && <ProgressHeader currentSlug={slug} />}
      <div ref={scrollContainerRef} className="doctor-onboarding-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain lg:overflow-visible">
        {children}
      </div>
    </div>
  );
}
