"use client";

import React, { useEffect, useState } from "react";
import { Textarea } from "@heroui/react";
import { ErrorBanner, Field, StepShell, textareaClassNames } from "@/doctor/components/onboarding/shell";
import { useAuth } from "@/doctor/lib/auth";
import { useStepSave } from "@/doctor/lib/edit-mode";
import { STEPS } from "@/doctor/lib/onboarding";

const MAX_BIO = 400;

export default function AboutStep() {
  const { profile } = useAuth();
  const save = useStepSave();
  const meta = STEPS[4];

  const [bio, setBio] = useState("");
  const [approach, setApproach] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setBio((profile.bio as string) || "");
    setApproach((profile.consultationApproach as string) || "");
  }, [profile]);

  const handleNext = async () => {
    setError(null);
    const b = bio.trim();
    if (b.length < 40) return setError("Bio should be at least 40 characters.");
    if (b.length > MAX_BIO) return setError(`Bio must be under ${MAX_BIO} characters.`);
    await save({
      slice: { bio: b, consultationApproach: approach.trim() || undefined },
      nextStep: 6,
      fromSlug: meta.slug,
    });
  };

  return (
    <StepShell {...meta} onNext={handleNext}>
      <Field
        label="Short bio"
        required
        hint={`${bio.length}/${MAX_BIO} characters. Write in third person — this appears next to your photo.`}
      >
        <Textarea
          value={bio}
          onValueChange={(v) => setBio(v.slice(0, MAX_BIO))}
          minRows={4}
          maxRows={8}
          variant="bordered"
          radius="lg"
          placeholder="Dr. Anika is a cardiologist with over a decade of experience helping patients manage heart conditions through preventive care and modern interventional techniques…"
          classNames={textareaClassNames}
        />
      </Field>

      <Field
        label="Consultation approach"
        hint="Optional. A line on how you like to work with patients."
      >
        <Textarea
          value={approach}
          onValueChange={setApproach}
          minRows={3}
          maxRows={5}
          variant="bordered"
          radius="lg"
          placeholder="I focus on listening first and ordering only the tests that change the plan…"
          classNames={textareaClassNames}
        />
      </Field>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
