"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Divider } from "@heroui/react";
import { FcGoogle } from "react-icons/fc";
import { auth } from "@/lib/firebase-auth";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
} from "firebase/auth";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import OtpInput from "@/components/forms/OtpInput";

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber || phoneNumber.length <= 4) {
      setError("Please enter a valid phone number.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send code.");
      setShowOTPInput(true);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Send OTP error:", error);
      setError(err.message || "Failed to send code.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone, code: verificationCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invalid code.");
      const result = await signInWithCustomToken(auth, data.token);
      if (result.user) onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Verify OTP error:", error);
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        onSuccess();
      }
    } catch (error: unknown) {
      console.error("Google sign-in error:", error);
      const err = error as { code?: string; message?: string };
      if (err.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized for Google Sign-in. Please add it to your Firebase Console.");
      } else {
        setError(err.message || "Google sign-in failed.");
      }
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <form onSubmit={showOTPInput ? verifyCode : handlePhoneLogin} className="min-w-0 space-y-4">
        {!showOTPInput ? (
          <div className="min-w-0 space-y-2">
            <label className="ml-1 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Phone number</label>
            <div className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-primary/40">
              <PhoneInput
                defaultCountry="in"
                value={phoneNumber}
                onChange={(phone) => setPhoneNumber(phone)}
              />
            </div>
            <p className="ml-1 text-[10px] leading-4 text-slate-400">We&apos;ll send a secure six-digit verification code.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-primary/10 bg-primary/5 p-3 text-sm">
              <span className="min-w-0 truncate font-bold text-slate-700">{phoneNumber}</span>
              <Button size="sm" variant="light" color="primary" className="shrink-0 font-bold" onClick={() => setShowOTPInput(false)}>Change</Button>
            </div>
            <div className="space-y-2">
              <label className="ml-1 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                Verification code
              </label>
              <OtpInput value={verificationCode} onChange={setVerificationCode} />
            </div>
          </div>
        )}

        {error && (
          <p className="break-words rounded-xl border border-danger/10 bg-danger/5 p-3 text-xs font-bold leading-5 text-danger">
            {error}
          </p>
        )}

        <Button
          color="primary"
          type="submit"
          className="h-14 w-full rounded-2xl text-base font-extrabold !text-white shadow-xl shadow-primary/20"
          isLoading={isLoading}
          spinnerPlacement="start"
        >
          {showOTPInput
            ? isLoading
              ? "Verifying..."
              : "Verify Code"
            : isLoading
            ? "Sending..."
            : "Continue with Phone"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Divider className="flex-1" />
        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">or continue with</span>
        <Divider className="flex-1" />
      </div>

      <Button
        startContent={<FcGoogle className="text-xl" />}
        variant="bordered"
        className="h-14 w-full rounded-2xl border-slate-200 bg-white text-base font-bold text-slate-800 shadow-sm"
        onClick={handleGoogleLogin}
      >
        Continue with Google
      </Button>
    </div>
  );
}
