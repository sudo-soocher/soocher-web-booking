"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@heroui/react";
import { FaCheck, FaWhatsapp } from "react-icons/fa";
import { ErrorBanner, Field, StepShell, inputClassNames } from "@/doctor/components/onboarding/shell";
import { useAuth } from "@/doctor/lib/auth";
import { STEPS, getNextStepSlug, saveStep } from "@/doctor/lib/onboarding";

const PHONE_RE = /^[6-9]\d{9}$/;

export default function ContactStep() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const meta = STEPS[1];

  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [whatsapp, setWhatsapp] = useState("");
  const [landline, setLandline] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setEmail((profile.email as string) || user?.email || "");
    setMobile((profile.mobile as string) || (user?.phoneNumber?.replace("+91", "") ?? ""));
    setSameAsMobile((profile.whatsappSameAsMobile as boolean) ?? true);
    setWhatsapp((profile.whatsapp as string) || "");
    setLandline((profile.clinicLandline as string) || "");
  }, [profile, user]);

  // Keep whatsapp in lock-step with mobile while "same as mobile" is on so the
  // value saved to Firestore always matches what the doctor sees on screen.
  useEffect(() => {
    if (sameAsMobile) setWhatsapp(mobile);
  }, [sameAsMobile, mobile]);

  const handleNext = async () => {
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError("Enter a valid email.");
    if (!PHONE_RE.test(mobile)) return setError("Mobile must be a valid 10-digit Indian number.");
    // When "same as mobile" is on, the effect above keeps `whatsapp === mobile`.
    // When off, the user types their own number — validate that.
    const wa = sameAsMobile ? mobile : whatsapp;
    if (!PHONE_RE.test(wa)) return setError("WhatsApp number must be a valid 10-digit Indian number.");
    if (!user) return;
    await saveStep(
      user.uid,
      {
        email: email.trim(),
        mobile,
        whatsappSameAsMobile: sameAsMobile,
        whatsapp: wa,
        clinicLandline: landline.trim() || undefined,
      },
      3
    );
    await refreshProfile();
    const next = getNextStepSlug(meta.slug);
    if (next) router.push(`/doc/onboarding/${next}`);
  };

  return (
    <StepShell {...meta} onNext={handleNext}>
      <Field label="Email address" required>
        <Input
          type="email"
          value={email}
          onValueChange={setEmail}
          variant="bordered"
          radius="lg"
          size="lg"
          placeholder="you@clinic.com"
          classNames={inputClassNames}
        />
      </Field>

      <Field label="Mobile number" required hint="10-digit Indian number, no +91 prefix.">
        <Input
          value={mobile}
          onValueChange={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))}
          variant="bordered"
          radius="lg"
          size="lg"
          startContent={<span className="text-sm font-bold text-slate-500">+91</span>}
          placeholder="9876543210"
          classNames={inputClassNames}
        />
      </Field>

      <button
        type="button"
        onClick={() => setSameAsMobile((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 bg-white p-4 text-left transition-all ${
          sameAsMobile
            ? "border-primary/40 shadow-md shadow-primary/10"
            : "border-slate-100 hover:border-primary-200"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${
              sameAsMobile ? "bg-primary text-white" : "bg-emerald-50 text-emerald-600"
            }`}
          >
            <FaWhatsapp className="text-base" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">WhatsApp same as mobile</div>
            <div className="truncate text-xs text-slate-500">
              {sameAsMobile && mobile
                ? `We'll use +91 ${mobile} for alerts.`
                : "We send appointment alerts on WhatsApp."}
            </div>
          </div>
        </div>

        {/* Custom toggle — kept inline so it always paints correctly */}
        <span
          role="presentation"
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors ${
            sameAsMobile ? "border-primary bg-primary" : "border-slate-200 bg-slate-100"
          }`}
        >
          <span
            className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow-sm transition-transform ${
              sameAsMobile ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          >
            {sameAsMobile && <FaCheck className="text-[8px] text-primary" />}
          </span>
        </span>
      </button>

      {!sameAsMobile && (
        <Field label="WhatsApp number" required hint="10-digit Indian number, no +91 prefix.">
          <Input
            value={whatsapp}
            onValueChange={(v) => setWhatsapp(v.replace(/\D/g, "").slice(0, 10))}
            variant="bordered"
            radius="lg"
            size="lg"
            startContent={<span className="text-sm font-bold text-slate-500">+91</span>}
            placeholder="9876543210"
            classNames={inputClassNames}
          />
        </Field>
      )}

      <Field label="Clinic landline" hint="Optional. Include STD code, e.g. 022-12345678.">
        <Input
          value={landline}
          onValueChange={setLandline}
          variant="bordered"
          radius="lg"
          size="lg"
          placeholder="Optional"
          classNames={inputClassNames}
        />
      </Field>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
