"use client";

import React, { useEffect, useState } from "react";
import { ErrorBanner, Field, StepShell } from "@/doctor/components/onboarding/shell";
import { ChipMultiSelect } from "@/doctor/components/onboarding/inputs";
import { useAuth } from "@/doctor/lib/auth";
import { useStepSave } from "@/doctor/lib/edit-mode";
import { INDIAN_LANGUAGES, STEPS } from "@/doctor/lib/onboarding";

export default function LanguagesStep() {
  const { profile } = useAuth();
  const save = useStepSave();
  const meta = STEPS[9];

  const [langs, setLangs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setLangs((profile.languages as string[]) || []);
  }, [profile]);

  const handleNext = async () => {
    setError(null);
    if (langs.length === 0) return setError("Pick at least one language.");
    await save({ slice: { languages: langs }, nextStep: 11, fromSlug: meta.slug });
  };

  return (
    <StepShell {...meta} onNext={handleNext}>
      <Field
        label="Languages you speak with patients"
        required
        hint="Patients can filter doctors by language."
      >
        <ChipMultiSelect
          options={INDIAN_LANGUAGES}
          value={langs}
          onChange={setLangs}
          allowCustom
          placeholder="Add another language…"
        />
      </Field>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
