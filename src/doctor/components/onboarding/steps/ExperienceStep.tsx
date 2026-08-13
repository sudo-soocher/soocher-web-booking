"use client";

import React, { useEffect, useState } from "react";
import { Input, Select, SelectItem } from "@heroui/react";
import { FaBriefcase, FaCheck } from "react-icons/fa";
import { ErrorBanner, Field, StepShell, inputClassNames, selectClassNames } from "@/doctor/components/onboarding/shell";
import { DynamicListSection, newId } from "@/doctor/components/onboarding/inputs";
import { useAuth } from "@/doctor/lib/auth";
import { useStepSave } from "@/doctor/lib/edit-mode";
import { INDIAN_STATES, STEPS } from "@/doctor/lib/onboarding";
import type { ExperienceItem } from "@/doctor/types/doctor";

export default function ExperienceStep() {
  const { profile } = useAuth();
  const save = useStepSave();
  const meta = STEPS[7];

  const [items, setItems] = useState<ExperienceItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setItems((profile.workExperience as ExperienceItem[]) || []);
  }, [profile]);

  const add = () =>
    setItems((prev) => [
      ...prev,
      {
        id: newId(),
        organisation: "",
        role: "",
        fromYear: "",
        toYear: "",
        isCurrent: false,
        city: "",
        state: "",
      },
    ]);
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const update = (id: string, patch: Partial<ExperienceItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleNext = async () => {
    setError(null);
    const clean = items.filter((i) => i.organisation.trim() && i.role.trim());
    if (clean.length === 0) return setError("Add at least one position.");
    await save({ slice: { workExperience: clean }, nextStep: 9, fromSlug: meta.slug });
  };

  return (
    <StepShell {...meta} onNext={handleNext}>
      <Field label="Positions held" hint="Most recent first.">
        <DynamicListSection
          items={items}
          onAdd={add}
          onRemove={remove}
          addLabel="Add position"
          emptyText="Add hospitals, clinics, or research roles you've held."
          renderItem={(item) => (
            <div className="space-y-3">
              <Input
                value={item.organisation}
                onValueChange={(v) => update(item.id, { organisation: v })}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="Organisation (e.g. Apollo Hospitals)"
                classNames={inputClassNames}
              />
              <Input
                value={item.role}
                onValueChange={(v) => update(item.id, { role: v })}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="Role (e.g. Senior Consultant Cardiologist)"
                classNames={inputClassNames}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={1950}
                  max={2100}
                  value={item.fromYear === "" ? "" : String(item.fromYear)}
                  onValueChange={(v) =>
                    update(item.id, { fromYear: v ? Number(v.slice(0, 4)) : "" })
                  }
                  variant="bordered"
                  radius="lg"
                  size="lg"
                  placeholder="From year"
                  classNames={inputClassNames}
                />
                <Input
                  type="number"
                  min={1950}
                  max={2100}
                  value={item.toYear === "" ? "" : String(item.toYear)}
                  onValueChange={(v) =>
                    update(item.id, { toYear: v ? Number(v.slice(0, 4)) : "" })
                  }
                  variant="bordered"
                  radius="lg"
                  size="lg"
                  isDisabled={item.isCurrent}
                  placeholder={item.isCurrent ? "Present" : "To year"}
                  classNames={inputClassNames}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  update(item.id, {
                    isCurrent: !item.isCurrent,
                    toYear: !item.isCurrent ? "" : item.toYear,
                  })
                }
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 bg-white p-3 text-left transition-all ${
                  item.isCurrent
                    ? "border-primary/40 shadow-md shadow-primary/10"
                    : "border-slate-100 hover:border-primary-200"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${
                      item.isCurrent
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <FaBriefcase className="text-[11px]" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    I currently work here
                  </span>
                </div>
                <span
                  role="presentation"
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors ${
                    item.isCurrent
                      ? "border-primary bg-primary"
                      : "border-slate-200 bg-slate-100"
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full bg-white shadow-sm transition-transform ${
                      item.isCurrent ? "translate-x-[20px]" : "translate-x-0.5"
                    }`}
                  >
                    {item.isCurrent && <FaCheck className="text-[7px] text-primary" />}
                  </span>
                </span>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={item.city}
                  onValueChange={(v) => update(item.id, { city: v })}
                  variant="bordered"
                  radius="lg"
                  size="lg"
                  placeholder="City"
                  classNames={inputClassNames}
                />
                <Select
                  selectedKeys={item.state ? [item.state] : []}
                  onChange={(e) => update(item.id, { state: e.target.value })}
                  variant="bordered"
                  radius="lg"
                  size="lg"
                  placeholder="State"
                  classNames={selectClassNames}
                >
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s}>{s}</SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          )}
        />
      </Field>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
