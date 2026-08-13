"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/doctor/lib/auth";
import { resumeStepSlug } from "@/doctor/lib/onboarding";
import { PageLoader } from "@/doctor/components/ui/PageLoader";

export default function OnboardingIndexPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    // Wait for the profile to materialise — otherwise we resume to step 1 for
    // a doctor who's actually mid-way through (their `onboardingStep` lives in
    // `profile`, which loads a tick after `user` does).
    if (user && profile === null) return;
    const slug = resumeStepSlug(profile as { onboardingStep?: number } | null);
    router.replace(`/doc/onboarding/${slug}`);
  }, [user, profile, loading, router]);

  return <PageLoader />;
}
