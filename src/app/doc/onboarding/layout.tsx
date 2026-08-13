"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/doctor/lib/auth";
import { ProgressHeader } from "@/doctor/components/onboarding/shell";
import { PageLoader } from "@/doctor/components/ui/PageLoader";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user, status, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";

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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F8FAFC] lg:h-auto lg:min-h-[100dvh] lg:overflow-visible">
      {showHeader && <ProgressHeader currentSlug={slug} />}
      <div className="flex-1 overflow-y-auto overscroll-y-contain lg:overflow-visible">
        {children}
      </div>
    </div>
  );
}
