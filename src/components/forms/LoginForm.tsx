"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Divider } from "@nextui-org/react";
import { FcGoogle } from "react-icons/fc";
import { auth } from "@/lib/firebase";
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
    <div className="flex flex-col gap-4">
      <form onSubmit={showOTPInput ? verifyCode : handlePhoneLogin} className="space-y-4">
        {!showOTPInput ? (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
            <PhoneInput
              defaultCountry="in"
              value={phoneNumber}
              onChange={(phone) => setPhoneNumber(phone)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600">{phoneNumber}</span>
              <Button size="sm" variant="light" color="primary" onClick={() => setShowOTPInput(false)}>Change</Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Verification Code
              </label>
              <OtpInput value={verificationCode} onChange={setVerificationCode} />
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs font-bold text-danger bg-danger/5 p-3 rounded-lg border border-danger/10">
            {error}
          </p>
        )}

        <Button color="primary" type="submit" className="w-full h-12 rounded-xl font-bold" isLoading={isLoading}>
          {showOTPInput ? "Verify Code" : "Continue with Phone"}
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <Divider className="flex-1" />
        <span className="text-default-400 text-sm">OR</span>
        <Divider className="flex-1" />
      </div>

      <Button
        startContent={<FcGoogle className="text-xl" />}
        variant="bordered"
        className="w-full"
        onClick={handleGoogleLogin}
      >
        Continue with Google
      </Button>
    </div>
  );
}
