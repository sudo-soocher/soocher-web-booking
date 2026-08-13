"use client";

import React, { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { setDoctorField, useAuth } from "@/doctor/lib/auth";
import { getNextStepSlug, saveStep } from "@/doctor/lib/onboarding";
import type { Doctor } from "@/doctor/types/doctor";

interface EditModeValue {
  isEditMode: boolean;
  /** Where to return after a successful edit save. */
  exitTo: string;
}

const EditModeContext = createContext<EditModeValue>({
  isEditMode: false,
  exitTo: "/doc/profile/edit",
});

export function EditModeProvider({
  children,
  exitTo = "/doc/profile/edit",
}: {
  children: React.ReactNode;
  exitTo?: string;
}) {
  return (
    <EditModeContext.Provider value={{ isEditMode: true, exitTo }}>
      {children}
    </EditModeContext.Provider>
  );
}

export const useEditMode = () => useContext(EditModeContext);

interface SaveOptions {
  slice: Partial<Doctor>;
  /** Onboarding-only: next step number (1-12). */
  nextStep: number;
  /** Onboarding-only: current step slug — used to compute the next route. */
  fromSlug: string;
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

/**
 * Save the current step's slice. Behaves differently depending on whether the
 * tree is wrapped in EditModeProvider:
 *   - Onboarding mode: advance onboardingStep + route to next step.
 *   - Edit mode: patch fields only + route back to the edit hub.
 */
export function useStepSave() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { isEditMode, exitTo } = useEditMode();

  return async ({ slice, nextStep, fromSlug }: SaveOptions) => {
    if (!user) return;
    if (isEditMode) {
      await setDoctorField(user.uid, stripUndefined(slice as Record<string, unknown>));
      await refreshProfile();
      router.push(exitTo);
      return;
    }
    await saveStep(user.uid, slice, nextStep);
    await refreshProfile();
    const next = getNextStepSlug(fromSlug);
    if (next) router.push(`/doc/onboarding/${next}`);
  };
}
