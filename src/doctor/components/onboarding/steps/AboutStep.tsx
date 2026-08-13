"use client";

import React, { useEffect, useState } from "react";
import { ErrorBanner, Field, StepShell } from "@/doctor/components/onboarding/shell";
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
      <div className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
        <Field label="Short bio" required>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value.slice(0, MAX_BIO))}
            rows={7}
            maxLength={MAX_BIO}
            placeholder="Dr. Anika is a cardiologist with over a decade of experience helping patients manage heart conditions through preventive care and modern interventional techniques…"
            className="block min-h-44 w-full min-w-0 resize-y rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 sm:min-h-48 sm:text-base"
          />
        </Field>
        <div className="mt-2 flex min-w-0 items-start justify-between gap-3 text-xs leading-5 text-slate-500">
          <span className="min-w-0 flex-1">Write in third person. This appears next to your photo.</span>
          <span className="shrink-0 font-bold tabular-nums text-slate-600">{bio.length}/{MAX_BIO}</span>
        </div>
      </div>

      <div className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
        <Field label="Consultation approach">
          <textarea
            value={approach}
            onChange={(event) => setApproach(event.target.value)}
            rows={5}
            placeholder="I focus on listening first and ordering only the tests that change the plan…"
            className="block min-h-32 w-full min-w-0 resize-y rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 sm:min-h-36 sm:text-base"
          />
        </Field>
        <p className="mt-2 text-xs leading-5 text-slate-500">Optional. A line on how you like to work with patients.</p>
      </div>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
