"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { STEPS, getStepIndex } from "@/doctor/lib/onboarding";
import { useAuth } from "@/doctor/lib/auth";
import { PageLoader } from "@/doctor/components/ui/PageLoader";

import BasicInfoStep from "@/doctor/components/onboarding/steps/BasicInfoStep";
import ContactStep from "@/doctor/components/onboarding/steps/ContactStep";
import SpecialityStep from "@/doctor/components/onboarding/steps/SpecialityStep";
import ExpertiseStep from "@/doctor/components/onboarding/steps/ExpertiseStep";
import AboutStep from "@/doctor/components/onboarding/steps/AboutStep";
import LicenceStep from "@/doctor/components/onboarding/steps/LicenceStep";
import EducationStep from "@/doctor/components/onboarding/steps/EducationStep";
import ExperienceStep from "@/doctor/components/onboarding/steps/ExperienceStep";
import AchievementsStep from "@/doctor/components/onboarding/steps/AchievementsStep";
import LanguagesStep from "@/doctor/components/onboarding/steps/LanguagesStep";
import ScheduleStep from "@/doctor/components/onboarding/steps/ScheduleStep";
import FinanceStep from "@/doctor/components/onboarding/steps/FinanceStep";

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  basic: BasicInfoStep,
  contact: ContactStep,
  speciality: SpecialityStep,
  expertise: ExpertiseStep,
  about: AboutStep,
  licence: LicenceStep,
  education: EducationStep,
  experience: ExperienceStep,
  achievements: AchievementsStep,
  languages: LanguagesStep,
  schedule: ScheduleStep,
  finance: FinanceStep,
};

export default function OnboardingStepPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.step as string) || "";
  const { user, profile, loading } = useAuth();

  // Block forward navigation past the saved step (no skipping ahead)
  React.useEffect(() => {
    if (loading) return;
    const targetIdx = getStepIndex(slug);
    if (targetIdx < 0) {
      router.replace("/doc/onboarding");
      return;
    }
    const savedStep = (profile?.onboardingStep as number | undefined) ?? 1;
    if (targetIdx + 1 > savedStep) {
      router.replace(`/doc/onboarding/${STEPS[savedStep - 1].slug}`);
    }
  }, [slug, profile, loading, router]);

  const Step = STEP_COMPONENTS[slug];
  // Show the loader until we have the auth state AND the profile snapshot.
  // Without the `user && !profile` guard, there's a brief tick on hard refresh
  // where loading is false but the profile fetch hasn't landed, and the step
  // mounts with empty defaults — visually that reads as a blank white flash.
  if (!Step || loading || (user && !profile)) {
    return <PageLoader />;
  }

  return <Step />;
}
