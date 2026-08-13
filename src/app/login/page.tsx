"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@nextui-org/react";
import { FcGoogle } from "react-icons/fc";
import { auth } from "@/lib/firebase-auth";
import { db } from "@/lib/firebase-db";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaCheckCircle, FaShieldAlt } from "react-icons/fa";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { markNativeSession } from "@/lib/native-session";
import { createNewPatient } from "@/types/patient";
import OtpInput from "@/components/forms/OtpInput";

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [needsPhoneLink, setNeedsPhoneLink] = useState(false);
  const [linkPhoneNumber, setLinkPhoneNumber] = useState("");
  const [linkPhoneCode, setLinkPhoneCode] = useState("");
  const [linkPhoneStage, setLinkPhoneStage] = useState<"input" | "otp">("input");
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [registrationData, setRegistrationData] = useState({
    name: "",
    email: "",
    dob: "",
    currentState: "",
    currentCity: "",
  });

  // Redirect if already authenticated AND profile exists; otherwise prompt for missing info
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "Users", user.uid));
          const data = snap.exists()
            ? (snap.data() as { name?: string; email?: string; phoneNumber?: string })
            : null;
          const hasName = !!data?.name && data.name.trim().length > 0;
          const hasEmail = !!data?.email && data.email.trim().length > 0;
          const hasPhone = !!(user.phoneNumber || data?.phoneNumber);

          if (hasName && hasEmail && hasPhone) {
            markNativeSession(user.uid);
            router.replace("/");
            return;
          }

          setPendingUser(user);
          setRegistrationData((prev) => ({
            ...prev,
            name: data?.name || prev.name,
            email: data?.email || user.email || prev.email,
          }));

          // If phone is missing (e.g. Google sign-in), verify phone first; registration after
          if (!hasPhone) {
            setNeedsPhoneLink(true);
            setLinkPhoneStage("input");
          } else {
            setNeedsRegistration(true);
          }
          setCheckingAuth(false);
        } catch (err) {
          console.error("Error checking user profile:", err);
          setCheckingAuth(false);
        }
      } else {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

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
      if (!response.ok) {
        throw new Error(data.error || "Failed to send code. Please try again.");
      }
      setShowOTPInput(true);
    } catch (err: unknown) {
      console.error("Error sending code:", err);
      setError((err as { message?: string }).message || "Failed to send code.");
    } finally {
      setIsLoading(false);
    }
  };

  const routeAfterAuth = async (user: User) => {
    const snap = await getDoc(doc(db, "Users", user.uid));
    const data = snap.exists()
      ? (snap.data() as { name?: string; email?: string; phoneNumber?: string })
      : null;
    const hasName = !!data?.name && data.name.trim().length > 0;
    const hasEmail = !!data?.email && data.email.trim().length > 0;
    const hasPhone = !!(user.phoneNumber || data?.phoneNumber);

    if (hasName && hasEmail && hasPhone) {
      markNativeSession(user.uid);
      router.push("/");
      return;
    }
    setPendingUser(user);
    setRegistrationData((prev) => ({
      ...prev,
      name: data?.name || prev.name,
      email: data?.email || user.email || prev.email,
    }));
    if (!hasPhone) {
      setNeedsPhoneLink(true);
      setLinkPhoneStage("input");
    } else {
      setNeedsRegistration(true);
    }
  };

  const sendLinkPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPhoneNumber || linkPhoneNumber.length <= 4) {
      setError("Please enter a valid phone number.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const formattedPhone = linkPhoneNumber.replace(/[\s\-\(\)]/g, "");
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send code.");
      setLinkPhoneStage("otp");
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Failed to send code.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyLinkPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPhoneCode || linkPhoneCode.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    if (!auth.currentUser) {
      setError("Not signed in.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const idToken = await auth.currentUser.getIdToken();
      const formattedPhone = linkPhoneNumber.replace(/[\s\-\(\)]/g, "");
      const response = await fetch("/api/auth/link-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ phone: formattedPhone, code: linkPhoneCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invalid code.");

      await auth.currentUser.reload();
      const snap = await getDoc(doc(db, "Users", auth.currentUser.uid));
      const docData = snap.exists() ? (snap.data() as { name?: string; email?: string }) : null;
      const hasName = !!docData?.name && docData.name.trim().length > 0;
      const hasEmail = !!docData?.email && docData.email.trim().length > 0;

      setNeedsPhoneLink(false);
      if (hasName && hasEmail) {
        router.push("/");
      } else {
        setNeedsRegistration(true);
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Invalid code.");
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
      if (!response.ok) {
        throw new Error(data.error || "Invalid verification code.");
      }
      const result = await signInWithCustomToken(auth, data.token);
      if (result.user) {
        await routeAfterAuth(result.user);
      }
    } catch (err: unknown) {
      console.error("Error verifying code:", err);
      setError((err as { message?: string }).message || "Invalid verification code.");
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
        await routeAfterAuth(result.user);
      }
    } catch (err: unknown) {
      console.error("Google sign-in error:", err);
      const firebaseErr = err as { code?: string; message?: string };
      if (firebaseErr.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized for Google Sign-in. Please add it to your Firebase Console.");
      } else {
        setError(firebaseErr.message || "Google sign-in failed.");
      }
    }
  };

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;

    if (!registrationData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    const emailValue = (registrationData.email || pendingUser.email || "").trim();
    if (!emailValue) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!registrationData.dob) {
      setError("Please enter your date of birth.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const patient = createNewPatient(
        pendingUser.uid,
        registrationData.name.trim(),
        pendingUser.phoneNumber || phoneNumber.replace(/[\s\-\(\)]/g, ""),
        registrationData.email.trim() || pendingUser.email || ""
      );
      const dobDate = new Date(registrationData.dob);
      patient.dob = isNaN(dobDate.getTime()) ? 0 : dobDate.getTime();
      patient.currentState = registrationData.currentState.trim();
      patient.currentCity = registrationData.currentCity.trim();

      await setDoc(doc(db, "Users", pendingUser.uid), patient);
      router.push("/");
    } catch (err: unknown) {
      console.error("Error saving profile:", err);
      const errorMessage =
        (err as { message?: string }).message ||
        "Failed to save profile. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse uppercase tracking-widest text-[10px]">
            Verifying your sanctuary access...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#F4F8FF] px-3 pb-6 pt-20 md:px-8 md:pb-8 md:pt-24">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-cyan-200/25 blur-3xl" />

      <button
        type="button"
        onClick={() => router.push("/")}
        className="mobile-pressable absolute left-4 top-4 z-20 flex h-10 items-center gap-2 rounded-2xl border border-white/90 bg-white/70 px-3.5 text-xs font-extrabold text-slate-700 shadow-[0_8px_24px_rgba(46,109,212,0.10)] backdrop-blur-xl md:left-8 md:top-7"
        style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
        aria-label="Back to home"
      >
        <FaArrowLeft className="text-[10px] text-primary" />
        Back to home
      </button>

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-7rem)] w-full max-w-6xl items-stretch overflow-hidden rounded-[32px] border border-white/90 bg-white/50 shadow-[0_30px_90px_rgba(46,109,212,0.14)] backdrop-blur-2xl lg:grid-cols-[0.92fr_1.08fr]">
      {/* Visual Side */}
      <div className="relative hidden overflow-hidden border-r border-white/80 bg-gradient-to-br from-blue-50 via-white to-cyan-50 lg:flex lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative z-10 w-full max-w-md space-y-8 p-10 xl:p-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3"
          >
            <Logo size="md" className="rounded-2xl shadow-lg shadow-primary/15" />
            <div>
              <p className="text-lg font-black tracking-tight text-slate-900">Soocher</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">Healthcare, simplified</p>
            </div>
          </motion.div>

          <div className="relative overflow-hidden rounded-[28px] border border-white bg-white/60 p-2 shadow-xl shadow-primary/10">
            <div
              className="h-64 rounded-[22px] bg-cover bg-top"
              style={{ backgroundImage: "url('/specialities/general-physician.jpg')" }}
              role="img"
              aria-label="Soocher healthcare specialist"
            />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-lg backdrop-blur-xl">
              <p className="text-sm font-black text-slate-900">Care that fits your day</p>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">Connect with verified specialists from wherever you are.</p>
            </div>
          </div>

          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-black leading-tight tracking-tight text-slate-900"
            >
              Your health journey,<br /><span className="text-primary">all in one place.</span>
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 gap-3"
          >
            {["Verified healthcare specialists", "Secure consultations and bookings", "Simple appointment management"].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-xs font-bold text-slate-600"><FaCheckCircle className="shrink-0 text-emerald-500" />{item}</div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex min-w-0 w-full items-center justify-center p-3 md:p-8 lg:p-10">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="min-w-0 w-full max-w-md space-y-6 overflow-hidden rounded-[28px] border border-white/90 bg-white/72 p-5 shadow-[0_22px_60px_rgba(46,109,212,0.10)] backdrop-blur-2xl md:p-8"
        >
          <div className="flex items-center gap-3 lg:hidden">
            <Logo size="sm" className="rounded-xl shadow-md shadow-primary/10" />
            <div><p className="text-base font-black tracking-tight text-slate-900">Soocher</p><p className="text-[8px] font-bold uppercase tracking-[0.16em] text-primary">Healthcare, simplified</p></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {needsPhoneLink
                ? "Verify Your Phone"
                : needsRegistration
                ? "Complete Your Profile"
                : "Welcome back"}
            </h2>
            <p className="text-slate-500 font-medium tracking-tight italic text-base md:text-lg">
              {needsPhoneLink
                ? "We need a verified mobile number to continue."
                : needsRegistration
                ? "A few details and you're in."
                : "Sign in to continue your healthcare journey."}
            </p>
          </div>

          {needsPhoneLink ? (
            <form
              onSubmit={linkPhoneStage === "input" ? sendLinkPhoneCode : verifyLinkPhoneCode}
              className="space-y-6"
            >
              {linkPhoneStage === "input" ? (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                    Mobile Number
                  </label>
                  <PhoneInput
                    defaultCountry="in"
                    value={linkPhoneNumber}
                    onChange={(p) => setLinkPhoneNumber(p)}
                  />
                  <p className="text-[10px] text-slate-400 font-medium italic ml-1">
                    We&apos;ll send a one-time code via WhatsApp.
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="min-w-0 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-bold text-slate-600">{linkPhoneNumber}</span>
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      className="font-bold"
                      onClick={() => setLinkPhoneStage("input")}
                    >
                      Change
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                      Verification Code
                    </label>
                    <OtpInput
                      value={linkPhoneCode}
                      onChange={setLinkPhoneCode}
                    />
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-bold text-danger text-center bg-danger/5 py-3 rounded-xl border border-danger/10"
                >
                  {error}
                </motion.p>
              )}

              <Button
                color="primary"
                type="submit"
                isLoading={isLoading}
                spinnerPlacement="start"
                className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 text-lg"
              >
                {linkPhoneStage === "input"
                  ? isLoading
                    ? "Sending..."
                    : "Send Code"
                  : isLoading
                  ? "Verifying..."
                  : "Verify & Continue"}
              </Button>
            </form>
          ) : needsRegistration ? (
            <form onSubmit={submitRegistration} className="space-y-6">
              <Input
                label="Full Name"
                variant="bordered"
                radius="lg"
                isRequired
                value={registrationData.name}
                onChange={(e) =>
                  setRegistrationData({ ...registrationData, name: e.target.value })
                }
                classNames={{
                  inputWrapper: "h-14 border-slate-200 hover:border-primary/50",
                  label: "font-bold text-slate-400",
                }}
              />
              <Input
                label="Email Address"
                type="email"
                variant="bordered"
                radius="lg"
                isRequired
                value={registrationData.email}
                onChange={(e) =>
                  setRegistrationData({ ...registrationData, email: e.target.value })
                }
                classNames={{
                  inputWrapper: "h-14 border-slate-200 hover:border-primary/50",
                  label: "font-bold text-slate-400",
                }}
              />
              <Input
                label="Date of Birth"
                type="date"
                variant="bordered"
                radius="lg"
                isRequired
                value={registrationData.dob}
                onChange={(e) =>
                  setRegistrationData({ ...registrationData, dob: e.target.value })
                }
                classNames={{
                  inputWrapper: "h-14 border-slate-200 hover:border-primary/50",
                  label: "font-bold text-slate-400",
                }}
              />
              <Input
                label="State"
                variant="bordered"
                radius="lg"
                value={registrationData.currentState}
                onChange={(e) =>
                  setRegistrationData({
                    ...registrationData,
                    currentState: e.target.value,
                  })
                }
                classNames={{
                  inputWrapper: "h-14 border-slate-200 hover:border-primary/50",
                  label: "font-bold text-slate-400",
                }}
              />
              <Input
                label="District"
                variant="bordered"
                radius="lg"
                value={registrationData.currentCity}
                onChange={(e) =>
                  setRegistrationData({
                    ...registrationData,
                    currentCity: e.target.value,
                  })
                }
                classNames={{
                  inputWrapper: "h-14 border-slate-200 hover:border-primary/50",
                  label: "font-bold text-slate-400",
                }}
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-bold text-danger text-center bg-danger/5 py-3 rounded-xl border border-danger/10"
                >
                  {error}
                </motion.p>
              )}

              <Button
                color="primary"
                type="submit"
                isLoading={isLoading}
                spinnerPlacement="start"
                className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 text-lg"
              >
                {isLoading ? "Saving..." : "Complete Registration"}
              </Button>
            </form>
          ) : (
          <div className="space-y-6">
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
                  <p className="text-[10px] text-slate-400 font-medium ml-1">We&apos;ll send a secure one-time code via WhatsApp.</p>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="min-w-0 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-bold text-slate-600">{phoneNumber}</span>
                    <Button size="sm" variant="light" color="primary" className="font-bold" onClick={() => setShowOTPInput(false)}>Change</Button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                      Verification Code
                    </label>
                    <OtpInput
                      value={verificationCode}
                      onChange={setVerificationCode}
                    />
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold text-danger text-center bg-danger/5 py-3 rounded-xl border border-danger/10">
                  {error}
                </motion.p>
              )}

              <Button
                color="primary"
                type="submit"
                isLoading={isLoading}
                spinnerPlacement="start"
                className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 text-lg"
              >
                {showOTPInput
                  ? isLoading
                    ? "Verifying..."
                    : "Verify & continue"
                  : isLoading
                  ? "Sending..."
                  : "Send verification code"}
              </Button>
            </form>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="mx-2 shrink-0 text-slate-400 font-bold text-[9px] uppercase tracking-[0.12em] sm:mx-4 sm:text-[10px] sm:tracking-[0.16em]">Or continue with</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Social Logins */}
            <div className="w-full">
              <Button
                variant="bordered"
                radius="lg"
                className="w-full h-14 font-bold border-slate-200 hover:bg-white"
                onClick={handleGoogleLogin}
                startContent={<FcGoogle className="text-2xl" />}
              >
                Continue with Google
              </Button>
            </div>
          </div>
          )}

          <div className="flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-slate-400">
            <FaShieldAlt className="text-success" />
            <p className="text-[10px] font-bold tracking-wide leading-loose">
              Secure sign-in and protected account data
            </p>
          </div>
        </motion.div>
      </div>
      </div>
    </main>
  );
}
