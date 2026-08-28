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
  signOut,
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
import { clearNativeSession, markNativeSession } from "@/lib/native-session";
import { fetchUserProfile } from "@/lib/user-profile";
import {
  claimDoctorAccount,
  destinationPath,
  resolveDestination,
  type Destination,
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

      // native-auth already ran this exact resolveDestination read and found
      // "needs registration" — it says so via ?complete=1 (+ pfn/pfe prefill
      // when available). Redoing the same Firestore read here duplicated a
      // full lookup on top of the one native-auth already paid for, on the
      // one page a first-time patient is actually waiting to see — this was
      // the real reason the registration form could take as long as two
      // sequential 8s timeouts to appear. Skipped only when NOT claiming a
      // doctor account, since that path still needs the fresh read below.
      if (!wantsDoctor) {
        const params = new URLSearchParams(window.location.search);
        if (params.get("complete") === "1") {
          setPendingUser(user);
          setRegistrationData((prev) => ({
            name: params.get("pfn") || prev.name,
            email: params.get("pfe") || prev.email,
          }));
          if (!user.phoneNumber) {
            setNeedsPhoneLink(true);
            setLinkPhoneStage("input");
          } else {
            setNeedsRegistration(true);
          }
          return false;
        }
      }

      // A timed-out/failed read (see resolveDestination's own withTimeout)
      // must not leave this signed-in user stuck: falling through to the
      // registration form (empty, since we couldn't confirm what's already
      // saved) is the safe default — it's re-submittable and never worse
      // than the alternative of bouncing them back to re-enter their phone
      // number while already authenticated.
      const destination: Destination = await resolveDestination(user.uid).catch((err) => {
        console.error("[login] resolveDestination failed:", err);
        return { kind: "patient-needs-profile", profile: {} };
      });
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

  // Warm the home-page chunk as soon as this page mounts, same as
  // native-auth already does — both the OTP flow and registration end here,
  // so without this the first navigation to "/" (right after submitting the
  // registration form) paid for a fresh chunk fetch at the exact moment the
  // page was supposed to feel done, not still loading.
  React.useEffect(() => {
    router.prefetch("/");
  }, [router]);

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
      // Routing happens in the onAuthStateChanged effect below, not here —
      // that listener fires for every sign-in method uniformly. Also calling
      // routeByAccount() from this handler used to race it: two concurrent
      // Firestore reads for the same uid, each independently deciding where
      // to send the user, could interleave and leave the page showing the
      // wrong state instead of completing the redirect.
      await signInWithCustomToken(auth, data.token);
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
      // Same reasoning as verifyCode above — the onAuthStateChanged effect
      // owns routing for every sign-in method; no need to duplicate it here.
      await signInWithPopup(auth, provider);
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

    setIsLoading(true);
    setError("");
    try {
      // dob/gender/currentState/currentCity are no longer collected here —
      // createNewPatient's own defaults (dob: 0, gender: "Other") apply;
      // the profile page still lets a patient fill these in later.
      const patient = createNewPatient(
        pendingUser.uid,
        registrationData.name.trim(),
        pendingUser.phoneNumber || phoneNumber.replace(/[\s\-\(\)]/g, ""),
        registrationData.email.trim() || pendingUser.email || ""
      );

      // Firestore's local cache (persistentLocalCache — see firebase-db.ts)
      // applies this write instantly for every reader; the write PROMISE
      // only resolves once the server acknowledges it, which is what made
      // this feel slow on anything but a fast connection. Racing a short
      // grace period against the real write means a healthy connection
      // still confirms normally (and a genuine fast failure — e.g. a rules
      // rejection — still surfaces below), but a merely slow one no longer
      // blocks the user on network latency for data that has already
      // landed locally and will keep syncing in the background regardless.
      const writePromise = setDoc(doc(db, "Users", pendingUser.uid), patient);
      writePromise.catch((err) =>
        console.error("[login] background profile save failed:", err)
      );
      await Promise.race([
        writePromise,
        new Promise((resolve) => setTimeout(resolve, 900)),
      ]);
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

  /**
   * Abandons an unfinished signup instead of leaving the only way out as
   * force-quitting the app. Deletes the incomplete `Users/{uid}` Firestore
   * doc server-side (see api/auth/skip-registration — it refuses to touch
   * an already-registered account, so this can't be misused to wipe a real
   * profile) and signs out. The phone number can OTP-verify again later
   * and get a clean signup.
   */
  const handleSkipRegistration = async () => {
    if (!pendingUser) return;
    setIsLoading(true);
    setError("");
    try {
      const idToken = await pendingUser.getIdToken();
      const res = await fetch("/api/auth/skip-registration", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || "Could not skip registration.");
      }
      clearNativeSession();
      await signOut(auth);
      setPendingUser(null);
      setNeedsRegistration(false);
      setRegistrationData({ name: "", email: "" });
      setPhoneNumber("");
      setShowOTPInput(false);
      setVerificationCode("");
    } catch (err: unknown) {
      console.error("Error skipping registration:", err);
      setError((err as { message?: string })?.message || "Could not skip registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return <HomeShimmer />;
  }

  if (needsRegistration) {
    // This is a full page (`/login?complete=1`), not a modal layered over
    // another route — there is no real page content behind it for a dark
    // scrim to dim, so a bg-slate-900/45 tint just rendered as a flat gray
    // screen. Same branded light background + soft blur blobs as the rest
    // of this page, so it reads as an intentional screen either way.
    return (
      <div className="relative flex h-[100dvh] min-h-0 w-full items-end justify-center overflow-hidden bg-[#F4F8FF]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-cyan-200/25 blur-3xl" />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="login-registration-sheet w-full max-w-lg rounded-t-[28px] bg-white px-5 pt-5 shadow-[0_-20px_60px_rgba(15,23,42,0.25)]"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="mb-5 flex items-center gap-3">
            <Logo size="sm" className="rounded-xl shadow-md shadow-primary/10" />
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900">Complete your profile</h2>
              <p className="text-[11px] font-medium text-slate-500">Just your name and email to get started.</p>
            </div>
          </div>

          <form onSubmit={submitRegistration} className="min-w-0 space-y-3">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="registration-name" className="ml-1 block text-[11px] font-extrabold text-slate-500">
                {t("profile.name")} <span className="text-danger">*</span>
              </label>
              <input
                id="registration-name"
                aria-label={t("profile.name")}
                required
                value={registrationData.name}
                onChange={(e) => setRegistrationData({ ...registrationData, name: e.target.value })}
                className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base text-slate-700 focus:border-primary focus:bg-white focus:outline-none"
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <label htmlFor="registration-email" className="ml-1 block text-[11px] font-extrabold text-slate-500">
                {t("profile.email")} <span className="text-danger">*</span>
              </label>
              <input
                id="registration-email"
                aria-label={t("profile.email")}
                type="email"
                required
                value={registrationData.email}
                onChange={(e) => setRegistrationData({ ...registrationData, email: e.target.value })}
                className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base text-slate-700 focus:border-primary focus:bg-white focus:outline-none"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-danger/10 bg-danger/5 py-2.5 text-center text-xs font-bold text-danger"
              >
                {error}
              </motion.p>
            )}

            <Button
              color="primary"
              type="submit"
              isLoading={isLoading}
              spinnerPlacement="start"
              className="h-12 w-full rounded-2xl text-base font-black shadow-lg shadow-primary/20"
            >
              {isLoading ? "Saving..." : "Complete Registration"}
            </Button>

            <button
              type="button"
              onClick={handleSkipRegistration}
              disabled={isLoading}
              className="mobile-pressable w-full py-2 text-center text-xs font-bold text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
            >
              Skip for now
            </button>
          </form>
        </motion.div>
      </div>
    );
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
          className="mobile-pressable absolute left-4 top-4 z-20 hidden h-10 items-center gap-2 rounded-2xl border border-white/90 bg-white/70 px-3.5 text-xs font-extrabold text-slate-700 shadow-[0_8px_24px_rgba(46,109,212,0.10)] backdrop-blur-xl md:left-8 md:top-7 md:flex"
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
          className="login-panel min-h-0 min-w-0 w-full max-w-md space-y-4 overflow-hidden rounded-[24px] border border-white/90 bg-white/72 p-4 shadow-[0_22px_60px_rgba(46,109,212,0.10)] backdrop-blur-2xl md:space-y-6 md:rounded-[28px] md:p-7"
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
