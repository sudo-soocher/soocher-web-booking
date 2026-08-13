"use client";

import React, { useEffect, useState } from "react";
import { Input, Select, SelectItem } from "@heroui/react";
import { ErrorBanner, Field, StepShell, inputClassNames, selectClassNames } from "@/doctor/components/onboarding/shell";
import { ChipMultiSelect } from "@/doctor/components/onboarding/inputs";
import { useAuth } from "@/doctor/lib/auth";
import { useStepSave } from "@/doctor/lib/edit-mode";
import { SPECIALITIES, STEPS } from "@/doctor/lib/onboarding";

export default function SpecialityStep() {
  const { profile } = useAuth();
  const save = useStepSave();
  const meta = STEPS[2];

  const [primary, setPrimary] = useState("");
  const [subs, setSubs] = useState<string[]>([]);
  const [years, setYears] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setPrimary((profile.primarySpeciality as string) || "");
    setSubs((profile.subSpecialities as string[]) || []);
    setYears(profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : "");
  }, [profile]);

  const handleNext = async () => {
    setError(null);
    if (!primary) return setError("Pick your primary speciality.");
    const y = Number(years);
    if (!Number.isFinite(y) || y < 0 || y > 70) return setError("Years of experience must be 0–70.");
    await save({
      slice: { primarySpeciality: primary, subSpecialities: subs, yearsOfExperience: y },
      nextStep: 4,
      fromSlug: meta.slug,
    });
  };

  return (
    <StepShell {...meta} onNext={handleNext}>
      <Field label="Primary speciality" required>
        <Select
          selectedKeys={primary ? [primary] : []}
          onChange={(e) => setPrimary(e.target.value)}
          variant="bordered"
          radius="lg"
          size="lg"
          placeholder="Select"
          classNames={selectClassNames}
        >
          {SPECIALITIES.map((s) => (
            <SelectItem key={s}>{s}</SelectItem>
          ))}
        </Select>
      </Field>

      <Field label="Sub-specialities" hint="Pick from the suggestions or add your own.">
        <ChipMultiSelect
          options={["Interventional", "Pediatric", "Geriatric", "Critical care", "Preventive"]}
          value={subs}
          onChange={setSubs}
          allowCustom
          placeholder="e.g. Sports medicine"
        />
      </Field>

      <Field label="Years of experience" required>
        <Input
          type="number"
          min={0}
          max={70}
          value={years}
          onValueChange={(v) => setYears(v.replace(/\D/g, "").slice(0, 2))}
          variant="bordered"
          radius="lg"
          size="lg"
          placeholder="e.g. 8"
          classNames={inputClassNames}
        />
      </Field>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
