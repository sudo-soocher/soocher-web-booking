"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@heroui/react";
import { ErrorBanner, Field, StepShell, inputClassNames } from "@/doctor/components/onboarding/shell";
import { DynamicListSection, newId } from "@/doctor/components/onboarding/inputs";
import { useAuth } from "@/doctor/lib/auth";
import { useStepSave } from "@/doctor/lib/edit-mode";
import { STEPS } from "@/doctor/lib/onboarding";
import type { EducationItem } from "@/doctor/types/doctor";

const yearInputProps = {
  type: "number" as const,
  min: 1950,
  max: 2100,
  variant: "bordered" as const,
  radius: "lg" as const,
  size: "lg" as const,
  classNames: inputClassNames,
};

export default function EducationStep() {
  const { profile } = useAuth();
  const save = useStepSave();
  const meta = STEPS[6];

  const [items, setItems] = useState<EducationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setItems((profile.education as EducationItem[]) || []);
  }, [profile]);

  const add = () =>
    setItems((prev) => [
      ...prev,
      { id: newId(), institution: "", degree: "", fromYear: "", toYear: "" },
    ]);
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const update = (id: string, patch: Partial<EducationItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleNext = async () => {
    setError(null);
    const clean = items.filter((i) => i.institution.trim() && i.degree.trim());
    if (clean.length === 0) return setError("Add at least one qualification.");
    await save({ slice: { education: clean }, nextStep: 8, fromSlug: meta.slug });
  };

  return (
    <StepShell {...meta} onNext={handleNext}>
      <Field label="Qualifications" hint="List most recent first.">
        <DynamicListSection
          items={items}
          onAdd={add}
          onRemove={remove}
          addLabel="Add qualification"
          emptyText="Add degrees, fellowships, and training programmes."
          renderItem={(item) => (
            <div className="space-y-3">
              <Input
                value={item.institution}
                onValueChange={(v) => update(item.id, { institution: v })}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="Institution (e.g. AIIMS, Delhi)"
                classNames={inputClassNames}
              />
              <Input
                value={item.degree}
                onValueChange={(v) => update(item.id, { degree: v })}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="Degree (e.g. MBBS, MD Cardiology)"
                classNames={inputClassNames}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  {...yearInputProps}
                  value={item.fromYear === "" ? "" : String(item.fromYear)}
                  onValueChange={(v) =>
                    update(item.id, { fromYear: v ? Number(v.slice(0, 4)) : "" })
                  }
                  placeholder="From year"
                />
                <Input
                  {...yearInputProps}
                  value={item.toYear === "" ? "" : String(item.toYear)}
                  onValueChange={(v) =>
                    update(item.id, { toYear: v ? Number(v.slice(0, 4)) : "" })
                  }
                  placeholder="To year"
                />
              </div>
            </div>
          )}
        />
      </Field>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
