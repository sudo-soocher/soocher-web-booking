"use client";

import React, { useEffect, useState } from "react";
import { Input, Select, SelectItem, Textarea } from "@heroui/react";
import { ErrorBanner, Field, StepShell, inputClassNames, selectClassNames, textareaClassNames } from "@/doctor/components/onboarding/shell";
import { DynamicListSection, newId } from "@/doctor/components/onboarding/inputs";
import { useAuth } from "@/doctor/lib/auth";
import { useStepSave } from "@/doctor/lib/edit-mode";
import { STEPS } from "@/doctor/lib/onboarding";
import type { AchievementItem, AchievementType } from "@/doctor/types/doctor";

const TYPES: { key: AchievementType; label: string }[] = [
  { key: "certification", label: "Certification" },
  { key: "award", label: "Award" },
  { key: "media", label: "Media feature" },
  { key: "publication", label: "Publication" },
  { key: "talk", label: "Conference talk" },
];

export default function AchievementsStep() {
  const { profile } = useAuth();
  const save = useStepSave();
  const meta = STEPS[8];

  const [items, setItems] = useState<AchievementItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setItems((profile.achievements as AchievementItem[]) || []);
  }, [profile]);

  const add = () =>
    setItems((prev) => [
      ...prev,
      { id: newId(), title: "", type: "certification", year: "", description: "" },
    ]);
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const update = (id: string, patch: Partial<AchievementItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleNext = async () => {
    setError(null);
    const clean = items.filter((i) => i.title.trim());
    await save({ slice: { achievements: clean }, nextStep: 10, fromSlug: meta.slug });
  };

  return (
    <StepShell {...meta} onNext={handleNext}>
      <Field label="Achievements" hint="Optional, but recommended — it boosts patient trust.">
        <DynamicListSection
          items={items}
          onAdd={add}
          onRemove={remove}
          addLabel="Add achievement"
          emptyText="Add certifications, awards, media features, papers, or talks."
          renderItem={(item) => (
            <div className="space-y-3">
              <Input
                value={item.title}
                onValueChange={(v) => update(item.id, { title: v })}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="Title"
                classNames={inputClassNames}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  selectedKeys={[item.type]}
                  onChange={(e) => update(item.id, { type: e.target.value as AchievementType })}
                  variant="bordered"
                  radius="lg"
                  size="lg"
                  classNames={selectClassNames}
                >
                  {TYPES.map((t) => (
                    <SelectItem key={t.key}>{t.label}</SelectItem>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={1950}
                  max={2100}
                  value={item.year === "" ? "" : String(item.year)}
                  onValueChange={(v) =>
                    update(item.id, { year: v ? Number(v.slice(0, 4)) : "" })
                  }
                  variant="bordered"
                  radius="lg"
                  size="lg"
                  placeholder="Year"
                  classNames={inputClassNames}
                />
              </div>
              <Textarea
                value={item.description || ""}
                onValueChange={(v) => update(item.id, { description: v })}
                minRows={2}
                maxRows={4}
                variant="bordered"
                radius="lg"
                placeholder="Short description (optional)"
                classNames={textareaClassNames}
              />
            </div>
          )}
        />
      </Field>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
