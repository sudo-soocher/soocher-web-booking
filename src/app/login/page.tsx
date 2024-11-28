"use client";

import React, { useState, useRef } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Divider,
} from "@nextui-org/react";
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
import { useRouter } from "next/navigation";

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showOTPInput, setShowOTPInput] = useState(false);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const router = useRouter();

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
      confirmationResultRef.current = confirmation;
      setShowOTPInput(true);
    } catch (error) {
      console.error("Error sending code:", error);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResultRef.current) {
      console.error("No confirmation result found");
      return;
    }

    try {
      const result = await confirmationResultRef.current.confirm(
        verificationCode
      );
      if (result.user) {
        router.push("/");
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
        router.push("/");
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  const handleAppleLogin = () => {
    // Implement Apple sign-in when you have Apple Developer account
    console.log("Apple sign-in to be implemented");
  };

  return (
    <main className="flex min-h-screen">
      {/* Left side with mesh gradient */}
      <div className="w-[70%] relative mesh-gradient flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white tracking-wider drop-shadow-lg">
            Welcome to
          </h1>
          <h1 className="text-7xl font-bold text-white tracking-wider drop-shadow-lg mt-2">
            Soocher
          </h1>
        </div>
      </div>

      {/* Right side with login form */}
      <div className="w-[30%] flex items-center justify-center bg-background/50 p-4">
        <Card className="w-full max-w-[280px] glass-effect">
          <CardHeader className="flex flex-col gap-3 text-center">
            <h1 className="text-2xl font-bold text-black/90">Sign In</h1>
          </CardHeader>
          <CardBody className="gap-4">
            {/* Phone Number Sign In */}
            <form
              onSubmit={showOTPInput ? verifyCode : handlePhoneLogin}
              className="flex flex-col gap-4"
            >
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                disabled={showOTPInput}
                classNames={{
                  input: "text-black/90 placeholder:text-black/60",
                  label: "text-black/90",
                }}
              />
              {showOTPInput && (
                <Input
                  label="Verification Code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  classNames={{
                    input: "text-black/90",
                    label: "text-black/90",
                  }}
                />
              )}
              <div id="recaptcha-container"></div>
              <Button
                color="primary"
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
              >
                {showOTPInput ? "Verify Code" : "Continue with Phone"}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-2 py-2">
              <Divider className="flex-1" />
              <span className="text-black/80 text-sm font-medium">OR</span>
              <Divider className="flex-1" />
            </div>

            {/* Social Sign In Options */}
            <div className="flex flex-col gap-2">
              <Button
                startContent={<FcGoogle className="text-xl" />}
                variant="bordered"
                className="w-full bg-white hover:bg-white/90 text-black/90 border-black/20 font-semibold"
                onClick={handleGoogleLogin}
              >
                Continue with Google
              </Button>

              <Button
                startContent={<BsApple className="text-xl" />}
                variant="bordered"
                className="w-full bg-white hover:bg-white/90 text-black/90 border-black/20 font-semibold"
                onClick={handleAppleLogin}
              >
                Continue with Apple
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
