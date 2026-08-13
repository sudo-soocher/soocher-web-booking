"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Select, SelectItem } from "@heroui/react";
import { ErrorBanner, Field, StepShell, inputClassNames, selectClassNames } from "@/doctor/components/onboarding/shell";
import { FileUploader } from "@/doctor/components/onboarding/inputs";
import { useAuth } from "@/doctor/lib/auth";
import { MEDICAL_COUNCILS, STEPS, getNextStepSlug, saveStep, uploadDoctorFile } from "@/doctor/lib/onboarding";

const AADHAAR_RE = /^\d{12}$/;

export default function LicenceStep() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const meta = STEPS[5];

  const [council, setCouncil] = useState("");
  const [regNo, setRegNo] = useState("");
  const [regDate, setRegDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [docUrl, setDocUrl] = useState<string | undefined>();
  const [aadhaar, setAadhaar] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setCouncil((profile.medicalCouncil as string) || "");
    setRegNo((profile.registrationNumber as string) || "");
    setRegDate((profile.registrationDate as string) || "");
    setValidUntil((profile.validUntil as string) || "");
    setDocUrl(profile.licenceDocUrl as string | undefined);
    setAadhaar((profile.aadhaarNumber as string) || "");
  }, [profile]);

  const handleNext = async () => {
    setError(null);
    if (!council) return setError("Select your medical council.");
    if (!regNo.trim()) return setError("Registration number is required.");
    if (!regDate) return setError("Registration date is required.");
    if (!validUntil) return setError("Valid-until date is required.");
    if (!docUrl) return setError("Upload your licence document.");
    if (!AADHAAR_RE.test(aadhaar)) return setError("Aadhaar must be 12 digits.");
    if (!user) return;
    await saveStep(
      user.uid,
      {
        medicalCouncil: council,
        registrationNumber: regNo.trim(),
        registrationDate: regDate,
        validUntil,
        licenceDocUrl: docUrl,
        aadhaarNumber: aadhaar,
      },
      7
    );
    await refreshProfile();
    const next = getNextStepSlug(meta.slug);
    if (next) router.push(`/doc/onboarding/${next}`);
  };

  return (
    <StepShell {...meta} onNext={handleNext}>
      <Field label="Medical council" required>
        <Select
          selectedKeys={council ? [council] : []}
          onChange={(e) => setCouncil(e.target.value)}
          variant="bordered"
          radius="lg"
          size="lg"
          placeholder="Select"
          classNames={selectClassNames}
        >
          {MEDICAL_COUNCILS.map((c) => (
            <SelectItem key={c}>{c}</SelectItem>
          ))}
        </Select>
      </Field>

      <Field label="Registration number" required>
        <Input
          value={regNo}
          onValueChange={setRegNo}
          variant="bordered"
          radius="lg"
          size="lg"
          placeholder="e.g. MMC/12345"
          classNames={inputClassNames}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Registration date" required>
          <Input
            type="date"
            value={regDate}
            onValueChange={setRegDate}
            variant="bordered"
            radius="lg"
            size="lg"
            classNames={inputClassNames}
          />
        </Field>
        <Field label="Valid until" required>
          <Input
            type="date"
            value={validUntil}
            onValueChange={setValidUntil}
            variant="bordered"
            radius="lg"
            size="lg"
            classNames={inputClassNames}
          />
        </Field>
      </div>

      <Field label="Licence document" required hint="PDF or JPG. Clear, full-page scan.">
        <FileUploader
          value={docUrl}
          onChange={setDocUrl}
          upload={(f) => uploadDoctorFile(user!.uid, "licence-document", f)}
        />
      </Field>

      <Field label="Aadhaar number (for KYC)" required hint="12 digits, no spaces. Stored securely.">
        <Input
          value={aadhaar}
          onValueChange={(v) => setAadhaar(v.replace(/\D/g, "").slice(0, 12))}
          variant="bordered"
          radius="lg"
          size="lg"
          placeholder="XXXX XXXX XXXX"
          classNames={inputClassNames}
        />
      </Field>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
