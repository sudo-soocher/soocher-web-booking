"use client";

import { useState, useRef } from "react";
import { Button, Input, Divider } from "@nextui-org/react";
import { FcGoogle } from "react-icons/fc";
import { BsApple } from "react-icons/bs";
import { auth } from "@/lib/firebase";
import {
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  ConfirmationResult,
} from "firebase/auth";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Initialize reCAPTCHA verifier
  const setupRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
    }
    const recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",
      }
    );
    recaptchaVerifierRef.current = recaptchaVerifier;
    return recaptchaVerifier;
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const recaptchaVerifier = setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifier
      );
      confirmationResultRef.current = confirmation;
      setShowOTPInput(true);
    } catch (error: any) {
      console.error("Error sending code:", error);
      setError(error.message || "Failed to send code.");
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResultRef.current) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await confirmationResultRef.current.confirm(verificationCode);
      if (result.user) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      setError("Invalid code. Please try again.");
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
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError("Google sign-in failed.");
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
            <Input
              label="Verification Code"
              variant="bordered"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
            />
          </div>
        )}

        {error && (
          <p className="text-xs font-bold text-danger bg-danger/5 p-3 rounded-lg border border-danger/10">
            {error}
          </p>
        )}

        <div id="recaptcha-container"></div>
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
