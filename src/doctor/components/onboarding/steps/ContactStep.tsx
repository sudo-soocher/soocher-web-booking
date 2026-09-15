"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@heroui/react";
import { FaCheck, FaShieldAlt, FaWhatsapp } from "react-icons/fa";
import { guessCountryByPartialPhoneNumber, removeDialCode } from "react-international-phone";
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
  const [mobileDialCode, setMobileDialCode] = useState("91");
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [whatsapp, setWhatsapp] = useState("");
  const [landline, setLandline] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mobile is always the OTP-verified number on the account, never a
    // stored/editable value — a doctor cannot silently swap the number
    // patients and the app already trust for that account.
    //
    // `user.phoneNumber` is a full E.164 string (e.g. "+96599456767"), not
    // always Indian — detect the real dial code instead of assuming "+91",
    // otherwise non-Indian numbers show the whole E.164 string glued onto a
    // hardcoded "+91" prefix.
    const raw = user?.phoneNumber ?? "";
    const { country } = guessCountryByPartialPhoneNumber({ phone: raw });
    const dialCode = country?.dialCode ?? "91";
    setMobileDialCode(dialCode);
    setMobile(removeDialCode({ phone: raw, dialCode }));
    if (!profile) return;
    setEmail((profile.email as string) || user?.email || "");
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
    // `mobile` mirrors the Firebase-auth OTP-verified number, which may
    // belong to any country — it's already been confirmed deliverable via
    // SMS, so just require it's present rather than re-checking it against
    // India's 10-digit format (that broke onboarding entirely for doctors
    // verified with a non-Indian number).
    if (!mobile.trim()) return setError("Mobile number is missing — please contact support.");
    // When "same as mobile" is on, the effect above keeps `whatsapp === mobile`.
    // When off, the user types a brand-new number in the doctor's own country
    // (mirrored from `mobileDialCode`) — apply India's strict 10-digit check
    // only for Indian doctors; otherwise just require a plausible length.
    const wa = sameAsMobile ? mobile : whatsapp;
    if (!sameAsMobile) {
      const waValid = mobileDialCode === "91" ? PHONE_RE.test(wa) : wa.trim().length >= 4;
      if (!waValid) {
        return setError(
          mobileDialCode === "91"
            ? "WhatsApp number must be a valid 10-digit Indian number."
            : "Enter a valid WhatsApp number."
        );
      }
    }
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

      <Field label="Mobile number" required hint="This is the number you verified with OTP — it can't be changed here.">
        <Input
          value={mobile}
          isReadOnly
          autoComplete="off"
          inputMode="none"
          variant="bordered"
          radius="lg"
          size="lg"
          startContent={
            <span className="text-sm font-bold text-slate-500">+{mobileDialCode}</span>
          }
          endContent={<FaShieldAlt className="text-sm text-emerald-500" aria-label="Verified" />}
          classNames={{
            ...inputClassNames,
            inputWrapper: `${inputClassNames.inputWrapper} bg-slate-50 cursor-not-allowed`,
            input: `${inputClassNames.input} cursor-not-allowed`,
          }}
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
                ? `We'll use +${mobileDialCode} ${mobile} for alerts.`
                : "We send appointment alerts on WhatsApp."}
            </div>
          </div>
        </div>

        {/* Custom toggle — kept inline so it always paints correctly. Uses
            flex justify-content to park the knob at an edge, not a hand-
            calculated translate-x offset — the previous pixel-math version
            could leave the knob short of the right edge in the ON state
            depending on box-sizing, which is what read as "not working". */}
        <span
          role="presentation"
          className={`flex h-7 w-12 shrink-0 items-center rounded-full border-2 p-0.5 transition-colors ${
            sameAsMobile ? "justify-end border-primary bg-primary" : "justify-start border-slate-200 bg-slate-100"
          }`}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white shadow-sm transition-transform">
            {sameAsMobile && <FaCheck className="text-[8px] text-primary" />}
          </span>
        </span>
      </button>

      {!sameAsMobile && (
        <Field
          label="WhatsApp number"
          required
          hint={
            mobileDialCode === "91"
              ? "10-digit Indian number, no +91 prefix."
              : `Number without the +${mobileDialCode} prefix.`
          }
        >
          <Input
            value={whatsapp}
            // No fixed 10-digit cap — that was Indian-only. Strip non-digits
            // and cap at 15, the longest a national number can be under E.164.
            onValueChange={(v) => setWhatsapp(v.replace(/\D/g, "").slice(0, 15))}
            variant="bordered"
            radius="lg"
            size="lg"
            // Same dial code the mobile field detected — a doctor's WhatsApp
            // number is assumed to be in the same country as their verified
            // mobile, not hardcoded to India.
            startContent={<span className="text-sm font-bold text-slate-500">+{mobileDialCode}</span>}
            placeholder={mobileDialCode === "91" ? "9876543210" : "99456767"}
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
