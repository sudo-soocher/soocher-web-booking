"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@heroui/react";
import { ErrorBanner, Field, StepShell, inputClassNames } from "@/doctor/components/onboarding/shell";
import { DynamicListSection, newId } from "@/doctor/components/onboarding/inputs";
import { useAuth } from "@/doctor/lib/auth";
import { useStepSave } from "@/doctor/lib/edit-mode";
import { STEPS } from "@/doctor/lib/onboarding";
import type { ExpertiseItem, ExpertiseType } from "@/doctor/types/doctor";

export default function ExpertiseStep() {
  const { profile } = useAuth();
  const save = useStepSave();
  const meta = STEPS[3];

  const [items, setItems] = useState<ExpertiseItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setItems((profile.expertiseItems as ExpertiseItem[]) || []);
  }, [profile]);

  const add = () =>
    setItems((prev) => [...prev, { id: newId(), name: "", type: "expertise" }]);
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const update = (id: string, patch: Partial<ExpertiseItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleNext = async () => {
    setError(null);
    const clean = items.filter((i) => i.name.trim());
    if (clean.length === 0) return setError("Add at least one expertise or procedure.");
    await save({ slice: { expertiseItems: clean }, nextStep: 5, fromSlug: meta.slug });
  };

  return (
    <StepShell {...meta} onNext={handleNext}>
      <Field
        label="Conditions you treat & procedures you perform"
        hint="Tag each one — used to rank you in patient search."
      >
        <DynamicListSection
          items={items}
          onAdd={add}
          onRemove={remove}
          addLabel="Add expertise or procedure"
          emptyText="Add the conditions you treat (e.g. Diabetes) and procedures you perform (e.g. Angioplasty)."
          renderItem={(item) => (
            <div className="flex flex-col gap-3">
              <Input
                value={item.name}
                onValueChange={(v) => update(item.id, { name: v })}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="e.g. Type 2 Diabetes"
                classNames={inputClassNames}
              />
              <div className="flex gap-2">
                {(["expertise", "procedure"] as ExpertiseType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update(item.id, { type: t })}
                    className={`flex-1 rounded-xl border-2 px-3 py-2 text-xs font-bold capitalize transition ${
                      item.type === t
                        ? "border-primary bg-primary-50 text-primary"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        />
      </Field>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
