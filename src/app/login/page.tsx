"use client";

import React, { useState, useRef } from "react";
import {
  Button,
  Input,
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
import { FaStethoscope, FaShieldAlt } from "react-icons/fa";
import { motion } from "framer-motion";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const router = useRouter();

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
    } catch (err: unknown) {
      console.error("Error sending code:", err);
      const errorMessage = (err as { message?: string }).message || "Failed to send code. Please try again.";
      setError(errorMessage);
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
      const result = await confirmationResultRef.current.confirm(
        verificationCode
      );
      if (result.user) {
        router.push("/");
      }
    } catch (err: unknown) {
      console.error("Error verifying code:", err);
      setError("Invalid verification code. Please try again.");
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
        router.push("/");
      }
    } catch (err: unknown) {
      console.error("Google sign-in error:", err);
      setError("Google sign-in failed.");
    }
  };

  return (
    <main className="flex min-h-screen bg-white">
      {/* Visual Side */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden mesh-gradient items-center justify-center">
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]" />

        <div className="relative z-10 p-20 max-w-2xl space-y-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center shadow-2xl"
          >
            <FaStethoscope className="text-primary text-4xl" />
          </motion.div>

          <div className="space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-7xl font-black text-white leading-tight tracking-tight"
            >
              Elegance in <br /><span className="text-white/60 italic">Healthcare.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-white/80 font-medium leading-relaxed"
            >
              Experience the future of medical consultations with our premium, minimal platform. Secure, swift, and sophisticated.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex gap-12"
          >
            <div>
              <p className="text-4xl font-black text-white">4k+</p>
              <p className="text-white/60 font-bold uppercase tracking-widest text-[10px] mt-1">Specialists</p>
            </div>
            <div>
              <p className="text-4xl font-black text-white">100k+</p>
              <p className="text-white/60 font-bold uppercase tracking-widest text-[10px] mt-1">Happy Souls</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-8 bg-[#F8FAFC]">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-sm space-y-10"
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Access Soocher</h2>
            <p className="text-slate-500 font-medium tracking-tight italic text-lg">Your health sanctuary awaits.</p>
          </div>

          <div className="space-y-8">
            {/* Phone Login */}
            <form onSubmit={showOTPInput ? verifyCode : handlePhoneLogin} className="space-y-6">
              {!showOTPInput ? (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                  <PhoneInput
                    defaultCountry="in"
                    value={phoneNumber}
                    onChange={(phone) => setPhoneNumber(phone)}
                  />
                  <p className="text-[10px] text-slate-400 font-medium italic ml-1">Verifying your identity with military-grade precision.</p>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">{phoneNumber}</span>
                    <Button size="sm" variant="light" color="primary" className="font-bold" onClick={() => setShowOTPInput(false)}>Change</Button>
                  </div>
                  <Input
                    label="Verification Code"
                    variant="bordered"
                    radius="lg"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    classNames={{
                      inputWrapper: "h-14 border-slate-200 hover:border-primary/50",
                      label: "font-bold text-slate-400"
                    }}
                  />
                </motion.div>
              )}

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold text-danger text-center bg-danger/5 py-3 rounded-xl border border-danger/10">
                  {error}
                </motion.p>
              )}

              <div id="recaptcha-container"></div>

              <Button
                color="primary"
                type="submit"
                isLoading={isLoading}
                className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 text-lg"
              >
                {showOTPInput ? "Unlock Account" : "Access Sanctuary"}
              </Button>
            </form>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">Or Transcend with</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="bordered"
                radius="lg"
                className="h-14 font-bold border-slate-200 hover:bg-white"
                onClick={handleGoogleLogin}
                startContent={<FcGoogle className="text-2xl" />}
              >
                Google
              </Button>
              <Button
                variant="bordered"
                radius="lg"
                className="h-14 font-bold border-slate-200 hover:bg-white"
                onClick={() => console.log("Apple sign-in")}
                startContent={<BsApple className="text-xl" />}
              >
                Apple
              </Button>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-center gap-2 text-slate-400">
            <FaShieldAlt className="text-success" />
            <p className="text-xs font-bold uppercase tracking-widest leading-loose">
              Military-grade encryption active
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
