"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { FaArrowLeft } from "react-icons/fa";
import { useAuth } from "@/doctor/lib/auth";
import { EditModeProvider } from "@/doctor/lib/edit-mode";

import AboutStep from "@/doctor/components/onboarding/steps/AboutStep";
import AchievementsStep from "@/doctor/components/onboarding/steps/AchievementsStep";
import EducationStep from "@/doctor/components/onboarding/steps/EducationStep";
import ExperienceStep from "@/doctor/components/onboarding/steps/ExperienceStep";
import ExpertiseStep from "@/doctor/components/onboarding/steps/ExpertiseStep";
import FinanceStep from "@/doctor/components/onboarding/steps/FinanceStep";
import LanguagesStep from "@/doctor/components/onboarding/steps/LanguagesStep";
import ScheduleStep from "@/doctor/components/onboarding/steps/ScheduleStep";
import SpecialityStep from "@/doctor/components/onboarding/steps/SpecialityStep";

const EDITABLE_SECTIONS: Record<string, React.ComponentType> = {
  speciality: SpecialityStep,
  expertise: ExpertiseStep,
  about: AboutStep,
  education: EducationStep,
  experience: ExperienceStep,
  achievements: AchievementsStep,
  languages: LanguagesStep,
  schedule: ScheduleStep,
  finance: FinanceStep,
};

export default function ProfileEditSectionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.section as string) || "";
  const { status, loading } = useAuth();

  // Only verified doctors can edit.
  useEffect(() => {
    if (loading) return;
    if (status && status !== "verified") {
      router.replace("/doc/profile");
    }
  }, [status, loading, router]);

  const StepComponent = EDITABLE_SECTIONS[slug];

  // Bad slug → back to hub.
  useEffect(() => {
    if (!loading && !StepComponent) {
      router.replace("/doc/profile/edit");
    }
  }, [StepComponent, loading, router]);

  if (loading || status !== "verified" || !StepComponent) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="sticky top-0 z-30 -mx-4 mb-2 flex items-center gap-3 border-b border-slate-100 bg-white/85 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Link
          href="/doc/profile/edit"
          aria-label="Back to edit hub"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-600 transition hover:bg-primary-50 hover:text-primary"
        >
          <FaArrowLeft />
        </Link>
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Edit profile
        </div>
      </div>

      <EditModeProvider exitTo="/doc/profile/edit">
        <StepComponent />
      </EditModeProvider>
    </div>
  );
}
