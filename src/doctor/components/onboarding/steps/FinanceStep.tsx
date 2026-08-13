"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@heroui/react";
import { ErrorBanner, Field, StepShell, inputClassNames } from "@/doctor/components/onboarding/shell";
import { setDoctorField, useAuth } from "@/doctor/lib/auth";
import { useEditMode } from "@/doctor/lib/edit-mode";
import { STEPS, submitOnboarding } from "@/doctor/lib/onboarding";
import type { PayoutMethod } from "@/doctor/types/doctor";

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_RE = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

export default function FinanceStep() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { isEditMode, exitTo } = useEditMode();
  const meta = STEPS[11];

  const [videoFee, setVideoFee] = useState("");
  const [chatFee, setChatFee] = useState("");
  const [followUpFee, setFollowUpFee] = useState("");
  const [method, setMethod] = useState<PayoutMethod>("upi");
  const [upi, setUpi] = useState("");
  const [acc, setAcc] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bank, setBank] = useState("");
  const [pan, setPan] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setVideoFee(profile.videoConsultFee != null ? String(profile.videoConsultFee) : "");
    setChatFee(profile.chatFee != null ? String(profile.chatFee) : "");
    setFollowUpFee(profile.followUpFee != null ? String(profile.followUpFee) : "");
    setMethod((profile.payoutMethod as PayoutMethod) || "upi");
    setUpi((profile.upiId as string) || "");
    setAcc((profile.bankAccountNumber as string) || "");
    setIfsc((profile.bankIfsc as string) || "");
    setBank((profile.bankName as string) || "");
    setPan((profile.panNumber as string) || "");
  }, [profile]);

  const handleSubmit = async () => {
    setError(null);
    const vf = Number(videoFee);
    const cf = Number(chatFee);
    const ff = Number(followUpFee);
    if (!Number.isFinite(vf) || vf < 0) return setError("Enter a valid video consult fee.");
    if (!Number.isFinite(cf) || cf < 0) return setError("Enter a valid chat fee.");
    if (!Number.isFinite(ff) || ff < 0) return setError("Enter a valid follow-up fee.");
    if (method === "upi") {
      if (!UPI_RE.test(upi)) return setError("Enter a valid UPI ID (e.g. name@bank).");
    } else {
      if (!acc || acc.length < 9) return setError("Enter a valid bank account number.");
      if (!IFSC_RE.test(ifsc.toUpperCase())) return setError("Enter a valid IFSC code.");
      if (!bank.trim()) return setError("Bank name is required.");
    }
    if (!PAN_RE.test(pan.toUpperCase())) return setError("Enter a valid PAN (e.g. ABCDE1234F).");
    if (!user) return;

    const slice = {
      videoConsultFee: vf,
      chatFee: cf,
      followUpFee: ff,
      payoutMethod: method,
      upiId: method === "upi" ? upi : undefined,
      bankAccountNumber: method === "bank" ? acc : undefined,
      bankIfsc: method === "bank" ? ifsc.toUpperCase() : undefined,
      bankName: method === "bank" ? bank.trim() : undefined,
      panNumber: pan.toUpperCase(),
    };

    if (isEditMode) {
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(slice)) if (v !== undefined) patch[k] = v;
      await setDoctorField(user.uid, patch);
      await refreshProfile();
      router.push(exitTo);
      return;
    }

    await submitOnboarding(user.uid, slice);
    await refreshProfile();
    // Land on the home dashboard; the pending-verification banner there shows
    // them the review is in progress.
    router.replace("/doc/dashboard");
  };

  return (
    <StepShell {...meta} onNext={handleSubmit} isLast>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Field label="Video consult fee (₹)" required>
          <Input
            type="number"
            min={0}
            value={videoFee}
            onValueChange={(v) => setVideoFee(v.replace(/\D/g, "").slice(0, 5))}
            variant="bordered"
            radius="lg"
            size="lg"
            placeholder="500"
            classNames={inputClassNames}
          />
        </Field>
        <Field label="Chat fee (₹)" required>
          <Input
            type="number"
            min={0}
            value={chatFee}
            onValueChange={(v) => setChatFee(v.replace(/\D/g, "").slice(0, 5))}
            variant="bordered"
            radius="lg"
            size="lg"
            placeholder="300"
            classNames={inputClassNames}
          />
        </Field>
        <Field label="Follow-up fee (₹)" required>
          <Input
            type="number"
            min={0}
            value={followUpFee}
            onValueChange={(v) => setFollowUpFee(v.replace(/\D/g, "").slice(0, 5))}
            variant="bordered"
            radius="lg"
            size="lg"
            placeholder="200"
            classNames={inputClassNames}
          />
        </Field>
      </div>

      <Field label="Payout method" required>
        <div className="flex gap-2">
          {(["upi", "bank"] as PayoutMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-2xl border-2 px-3 py-3 text-sm font-bold uppercase transition ${
                method === m
                  ? "border-primary bg-primary-50 text-primary"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {m === "upi" ? "UPI" : "Bank account"}
            </button>
          ))}
        </div>
      </Field>

      {method === "upi" ? (
        <Field label="UPI ID" required>
          <Input
            value={upi}
            onValueChange={setUpi}
            variant="bordered"
            radius="lg"
            size="lg"
            placeholder="name@hdfcbank"
            classNames={inputClassNames}
          />
        </Field>
      ) : (
        <div className="space-y-5">
          <Field label="Bank account number" required>
            <Input
              value={acc}
              onValueChange={(v) => setAcc(v.replace(/\D/g, "").slice(0, 18))}
              variant="bordered"
              radius="lg"
              size="lg"
              classNames={inputClassNames}
            />
          </Field>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="IFSC code" required>
              <Input
                value={ifsc}
                onValueChange={(v) => setIfsc(v.toUpperCase().slice(0, 11))}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="HDFC0001234"
                classNames={inputClassNames}
              />
            </Field>
            <Field label="Bank name" required>
              <Input
                value={bank}
                onValueChange={setBank}
                variant="bordered"
                radius="lg"
                size="lg"
                placeholder="HDFC Bank"
                classNames={inputClassNames}
              />
            </Field>
          </div>
        </div>
      )}

      <Field label="PAN number (for TDS)" required hint="Format: ABCDE1234F">
        <Input
          value={pan}
          onValueChange={(v) => setPan(v.toUpperCase().slice(0, 10))}
          variant="bordered"
          radius="lg"
          size="lg"
          classNames={inputClassNames}
        />
      </Field>

      <ErrorBanner message={error} />
    </StepShell>
  );
}
