"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FcGoogle } from "react-icons/fc";
import { auth } from "@/lib/firebase-auth";
import { db } from "@/lib/firebase-db";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaCheckCircle, FaShieldAlt } from "react-icons/fa";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useTranslation } from "@/i18n/LanguageProvider";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { markNativeSession } from "@/lib/native-session";
import { fetchUserProfile } from "@/lib/user-profile";
import {
  claimDoctorAccount,
  destinationPath,
  resolveDestination,
} from "@/lib/post-login-route";
import { createNewPatient } from "@/types/patient";
import OtpInput from "@/components/forms/OtpInput";
import { HomeShimmer } from "@/components/loading/HomeShimmer";
import { useMobileVisualViewport } from "@/hooks/useMobileVisualViewport";

export default function Login() {
  // 100dvh can briefly keep describing the pre-keyboard height in WKWebView,
  // which left a gap of blank space at the top of the page when a field near
  // the bottom of the registration form was focused. Always active — harmless
  // when no field is focused, and the login/OTP forms can trigger the
  // keyboard too. Same fix already used for the chat viewport.
  const viewportRef = useMobileVisualViewport<HTMLElement>(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { t } = useTranslation();
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
    gender: "",
    currentState: "",
    currentCity: "",
  });


  /**
   * Send a signed-in user to wherever their account belongs.
   *
   * Login is unified, so role is only knowable after the session exists.
   * `?as=doctor` (set by the /doc entry point) promotes an account that has no
   * type yet — it can never overwrite an established one.
   *
   * Returns true when it redirected; false means the caller should collect the
   * missing patient profile fields on this page.
   */
  const routeByAccount = React.useCallback(
    async (user: User): Promise<boolean> => {
      const wantsDoctor =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("as") === "doctor";

      if (wantsDoctor) {
        await claimDoctorAccount(user.uid, user.phoneNumber).catch(() => false);
      }

      const destination = await resolveDestination(user.uid);
      const path = destinationPath(destination);

      if (path) {
        // Cache the destination too, so a later Flutter relaunch can land a
        // doctor in the doctor app on its very first frame.
        markNativeSession(user.uid, path);
        router.replace(path);
        return true;
      }

      setPendingUser(user);
      setRegistrationData((prev) => ({
        ...prev,
        name: destination.kind === "patient-needs-profile"
          ? destination.profile.name || prev.name
          : prev.name,
        email: destination.kind === "patient-needs-profile"
          ? destination.profile.email || user.email || prev.email
          : prev.email,
      }));

      const hasPhone = !!(
        user.phoneNumber ||
        (destination.kind === "patient-needs-profile" && destination.profile.phoneNumber)
      );
      if (!hasPhone) {
        setNeedsPhoneLink(true);
        setLinkPhoneStage("input");
      } else {
        setNeedsRegistration(true);
      }
      return false;
    },
    [router]
  );

  // A role guard bounced this user here because their account doesn't match
  // the login entry point they used. Read the flag off window.location
  // rather than useSearchParams, which would force this statically-
  // prerendered page into a Suspense boundary.
  React.useEffect(() => {
    const denied = new URLSearchParams(window.location.search).get("denied");
    if (denied === "1") setError(t("login.deniedNotDoctor"));
    else if (denied === "already-doctor") setError(t("login.deniedAlreadyDoctor"));
  }, [t]);

  // Redirect if already authenticated AND profile exists; otherwise prompt for missing info
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const redirected = await routeByAccount(user);
          if (!redirected) setCheckingAuth(false);
        } catch (err) {
          console.error("Error checking user profile:", err);
          setCheckingAuth(false);
        }
      } else {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router, routeByAccount]);

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber || phoneNumber.length <= 4) {
      setError(t("login.invalidPhone"));
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
        throw new Error(data.error || t("login.sendFailedRetry"));
      }
      setShowOTPInput(true);
    } catch (err: unknown) {
      console.error("Error sending code:", err);
      setError((err as { message?: string }).message || t("login.sendFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const routeAfterAuth = async (user: User) => {
    await routeByAccount(user);
  };

  const sendLinkPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPhoneNumber || linkPhoneNumber.length <= 4) {
      setError(t("login.invalidPhone"));
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
      if (!response.ok) throw new Error(data.error || t("login.sendFailed"));
      setLinkPhoneStage("otp");
    } catch (err: unknown) {
      setError((err as { message?: string }).message || t("login.sendFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const verifyLinkPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPhoneCode || linkPhoneCode.length !== 6) {
      setError(t("login.invalidCode"));
      return;
    }
    if (!auth.currentUser) {
      setError(t("login.notSignedIn"));
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
      if (!response.ok) throw new Error(data.error || t("login.invalidCodeErr"));

      await auth.currentUser.reload();
      const docData = await fetchUserProfile(auth.currentUser.uid);
      const hasName = !!docData?.name && docData.name.trim().length > 0;
      const hasEmail = !!docData?.email && docData.email.trim().length > 0;

      setNeedsPhoneLink(false);
      if (hasName && hasEmail) {
        router.push("/");
      } else {
        setNeedsRegistration(true);
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message || t("login.invalidCodeErr"));
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setError(t("login.invalidCode"));
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
        throw new Error(data.error || t("login.invalidVerificationCode"));
      }
      const result = await signInWithCustomToken(auth, data.token);
      if (result.user) {
        await routeAfterAuth(result.user);
      }
    } catch (err: unknown) {
      console.error("Error verifying code:", err);
      setError((err as { message?: string }).message || t("login.invalidVerificationCode"));
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
        setError(firebaseErr.message || t("login.googleFailed"));
      }
    }
  };

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;

    if (!registrationData.name.trim()) {
      setError(t("login.enterName"));
      return;
    }
    const emailValue = (registrationData.email || pendingUser.email || "").trim();
    if (!emailValue) {
      setError(t("login.enterEmail"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setError(t("login.enterValidEmail"));
      return;
    }
    if (!registrationData.dob) {
      setError(t("login.enterDob"));
      return;
    }
    if (!registrationData.gender) {
      setError(t("login.enterGender"));
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
      patient.gender = registrationData.gender as "Male" | "Female" | "Other";
      patient.currentState = registrationData.currentState.trim();
      patient.currentCity = registrationData.currentCity.trim();

      await setDoc(doc(db, "Users", pendingUser.uid), patient);
      router.push("/");
    } catch (err: unknown) {
      console.error("Error saving profile:", err);
      const errorMessage =
        (err as { message?: string }).message ||
        t("login.saveFailed");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return <HomeShimmer />;
  }

  return (
    <main
      ref={viewportRef}
      className="login-page relative h-[100dvh] min-h-0 w-full max-w-full overflow-hidden bg-[#F4F8FF] px-3 pb-3 pt-16 md:px-8 md:pb-8 md:pt-24"
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-cyan-200/25 blur-3xl" />

      {/* Not shown on the registration form — a half-filled signup is not
          something to invite abandoning mid-flow back to home. */}
      {!needsRegistration && (
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mobile-pressable absolute left-4 top-4 z-20 flex h-10 items-center gap-2 rounded-2xl border border-white/90 bg-white/70 px-3.5 text-xs font-extrabold text-slate-700 shadow-[0_8px_24px_rgba(46,109,212,0.10)] backdrop-blur-xl md:left-8 md:top-7"
          style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
          aria-label={t("login.backToHome")}
        >
          <FaArrowLeft className="text-[10px] text-primary" />
          {t("login.backToHome")}
        </button>
      )}

      {/* Mirrors the back button, so a first-time user can switch language
          before having to read English to sign in. */}
      <div
        className="absolute right-4 top-4 z-20 md:right-8 md:top-7"
        style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
      >
        <LanguageSwitcher className="border border-white/90 bg-white/70 backdrop-blur-xl" />
      </div>

      <div className="login-shell relative z-10 mx-auto grid h-full min-h-0 w-full max-w-6xl items-stretch overflow-hidden rounded-[28px] border border-white/90 bg-white/50 shadow-[0_30px_90px_rgba(46,109,212,0.14)] backdrop-blur-2xl lg:grid-cols-[0.92fr_1.08fr] md:rounded-[32px]">
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
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">{t("brand.tagline")}</p>
            </div>
          </motion.div>

          <div className="relative overflow-hidden rounded-[28px] border border-white bg-white/60 p-2 shadow-xl shadow-primary/10">
            <div
              className="h-64 rounded-[22px] bg-cover bg-top"
              style={{ backgroundImage: "url('/specialities/general-physician.jpg')" }}
              role="img"
              aria-label={t("login.heroAlt")}
            />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-lg backdrop-blur-xl">
              <p className="text-sm font-black text-slate-900">{t("login.heroTitle")}</p>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">{t("login.heroBlurb")}</p>
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
            {[t("login.perk1"), t("login.perk2"), t("login.perk3")].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-xs font-bold text-slate-600"><FaCheckCircle className="shrink-0 text-emerald-500" />{item}</div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex h-full min-h-0 min-w-0 w-full items-center justify-center p-2 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`login-panel min-h-0 min-w-0 w-full max-w-md space-y-4 rounded-[24px] border border-white/90 bg-white/72 p-4 shadow-[0_22px_60px_rgba(46,109,212,0.10)] backdrop-blur-2xl md:space-y-6 md:rounded-[28px] md:p-7 ${needsRegistration ? "mobile-scroll overflow-x-hidden overflow-y-auto" : "overflow-hidden"}`}
          style={
            needsRegistration
              ? { paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }
              : undefined
          }
        >
          <div className="login-brand flex items-center gap-3 lg:hidden">
            <Logo size="sm" className="rounded-xl shadow-md shadow-primary/10" />
            <div><p className="text-base font-black tracking-tight text-slate-900">Soocher</p><p className="text-[8px] font-bold uppercase tracking-[0.16em] text-primary">{t("brand.tagline")}</p></div>
          </div>
          <div className="login-intro space-y-1.5 md:space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {needsPhoneLink
                ? t("login.verifyPhoneTitle")
                : needsRegistration
                ? t("login.completeProfileTitle")
                : t("login.welcomeBack")}
            </h2>
            <p className="login-subtitle text-sm font-medium italic tracking-tight text-slate-500 md:text-lg">
              {needsPhoneLink
                ? t("login.verifyPhoneBlurb2")
                : needsRegistration
                ? t("login.completeProfileBlurb2")
                : t("login.welcomeBackBlurb")}
            </p>
          </div>

          {needsPhoneLink ? (
            <form
              onSubmit={linkPhoneStage === "input" ? sendLinkPhoneCode : verifyLinkPhoneCode}
              className="space-y-4 md:space-y-6"
            >
              {linkPhoneStage === "input" ? (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                    {t("login.mobileNumber")}
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
                className="w-full h-12 md:h-14 rounded-2xl font-black shadow-xl shadow-primary/20 text-base md:text-lg"
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
            <form onSubmit={submitRegistration} className="login-registration-form min-w-0 space-y-3 pb-1 md:space-y-4">
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="registration-name" className="ml-1 block break-words text-[11px] font-extrabold leading-4 text-slate-500">
                  {t("profile.name")} <span className="text-danger">*</span>
                </label>
                <input
                  id="registration-name"
                  aria-label={t("profile.name")}
                  required
                  value={registrationData.name}
                  onChange={(e) =>
                    setRegistrationData({ ...registrationData, name: e.target.value })
                  }
                  className="h-12 md:h-14 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base md:text-sm text-slate-700 hover:border-primary/50 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="min-w-0 space-y-1.5">
                <label htmlFor="registration-email" className="ml-1 block break-words text-[11px] font-extrabold leading-4 text-slate-500">
                  {t("profile.email")} <span className="text-danger">*</span>
                </label>
                <input
                  id="registration-email"
                  aria-label={t("profile.email")}
                  type="email"
                  required
                  value={registrationData.email}
                  onChange={(e) =>
                    setRegistrationData({ ...registrationData, email: e.target.value })
                  }
                  className="h-12 md:h-14 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base md:text-sm text-slate-700 hover:border-primary/50 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="min-w-0 space-y-1.5">
                <label htmlFor="registration-dob" className="ml-1 block break-words text-[11px] font-extrabold leading-4 text-slate-500">
                  {t("profile.dob")} <span className="text-danger">*</span>
                </label>
                <input
                  id="registration-dob"
                  aria-label={t("profile.dob")}
                  type="date"
                  required
                  value={registrationData.dob}
                  onChange={(e) =>
                    setRegistrationData({ ...registrationData, dob: e.target.value })
                  }
                  className="h-12 md:h-14 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base md:text-sm text-slate-700 hover:border-primary/50 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="min-w-0 space-y-1.5">
                <label htmlFor="registration-gender" className="ml-1 block break-words text-[11px] font-extrabold leading-4 text-slate-500">
                  {t("profile.gender")} <span className="text-danger">*</span>
                </label>
                <select
                  id="registration-gender"
                  aria-label={t("profile.gender")}
                  required
                  value={registrationData.gender}
                  onChange={(e) =>
                    setRegistrationData({ ...registrationData, gender: e.target.value })
                  }
                  className="h-12 md:h-14 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base md:text-sm text-slate-700 hover:border-primary/50 focus:border-primary focus:outline-none"
                >
                  <option value="">—</option>
                  <option value="Male">{t("profile.genderMale")}</option>
                  <option value="Female">{t("profile.genderFemale")}</option>
                  <option value="Other">{t("profile.genderOther")}</option>
                </select>
              </div>

              <div className="min-w-0 space-y-1.5">
                <label htmlFor="registration-state" className="ml-1 block break-words text-[11px] font-extrabold leading-4 text-slate-500">
                  {t("profile.state")}
                </label>
                <input
                  id="registration-state"
                  aria-label={t("profile.state")}
                  value={registrationData.currentState}
                  onChange={(e) =>
                    setRegistrationData({ ...registrationData, currentState: e.target.value })
                  }
                  className="h-12 md:h-14 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base md:text-sm text-slate-700 hover:border-primary/50 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="min-w-0 space-y-1.5">
                <label htmlFor="registration-district" className="ml-1 block break-words text-[11px] font-extrabold leading-4 text-slate-500">
                  {t("login.district")}
                </label>
                <input
                  id="registration-district"
                  aria-label={t("login.district")}
                  value={registrationData.currentCity}
                  onChange={(e) =>
                    setRegistrationData({ ...registrationData, currentCity: e.target.value })
                  }
                  className="h-12 md:h-14 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base md:text-sm text-slate-700 hover:border-primary/50 focus:border-primary focus:outline-none"
                />
              </div>

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
                className="w-full h-12 md:h-14 rounded-2xl font-black shadow-xl shadow-primary/20 text-base md:text-lg"
              >
                {isLoading ? "Saving..." : "Complete Registration"}
              </Button>
            </form>
          ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Phone Login */}
            <form onSubmit={showOTPInput ? verifyCode : handlePhoneLogin} className="space-y-4 md:space-y-6">
              {!showOTPInput ? (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">{t("login.phoneNumberLabel")}</label>
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
                    <Button size="sm" variant="light" color="primary" className="font-bold" onClick={() => setShowOTPInput(false)}>{t("login.change")}</Button>
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
                className="w-full h-12 md:h-14 rounded-2xl font-black shadow-xl shadow-primary/20 text-base md:text-lg"
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
              <span className="mx-2 shrink-0 text-slate-400 font-bold text-[9px] uppercase tracking-[0.12em] sm:mx-4 sm:text-[10px] sm:tracking-[0.16em]">{t("login.orContinue")}</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Social Logins */}
            <div className="w-full">
              <Button
                variant="bordered"
                radius="lg"
                className="w-full h-12 md:h-14 font-bold border-slate-200 hover:bg-white"
                onClick={handleGoogleLogin}
                startContent={<FcGoogle className="text-2xl" />}
              >
                Continue with Google
              </Button>
            </div>
          </div>
          )}

          <div className="login-security flex items-center justify-center gap-2 border-t border-slate-100 pt-3 text-slate-400 md:pt-4">
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
