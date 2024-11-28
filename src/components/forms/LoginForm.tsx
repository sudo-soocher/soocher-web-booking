"use client";

import { useState } from "react";
import { Button, Input, Divider } from "@nextui-org/react";
import { FcGoogle } from "react-icons/fc";
import { BsApple } from "react-icons/bs";
import { auth } from "@/lib/firebase";
import {
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
} from "firebase/auth";

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showOTPInput, setShowOTPInput] = useState(false);

  // Initialize reCAPTCHA verifier
  const setupRecaptcha = () => {
    const recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",
      }
    );
    return recaptchaVerifier;
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const recaptchaVerifier = setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifier
      );
      window.confirmationResult = confirmation;
      setShowOTPInput(true);
    } catch (error) {
      console.error("Error sending code:", error);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await window.confirmationResult.confirm(verificationCode);
      if (result.user) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error verifying code:", error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        onSuccess();
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={showOTPInput ? verifyCode : handlePhoneLogin}>
        <Input
          label="Phone Number"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
          disabled={showOTPInput}
        />
        {showOTPInput && (
          <Input
            label="Verification Code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            required
            className="mt-4"
          />
        )}
        <div id="recaptcha-container"></div>
        <Button color="primary" type="submit" className="w-full mt-4">
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
