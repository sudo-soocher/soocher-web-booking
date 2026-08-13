"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaStethoscope, FaArrowRight } from "react-icons/fa";
import { Button } from "@/doctor/components/ui/Button";
import { PageLoader } from "@/doctor/components/ui/PageLoader";
import { useAuth } from "@/doctor/lib/auth";

const WELCOMED_KEY = "soocher_doctor_welcomed";

export default function SplashPage() {
  const router = useRouter();
  const { user, status, loading, signOut } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    const welcomed = typeof window !== "undefined" && localStorage.getItem(WELCOMED_KEY);

    if (user) {
      // A signed-in patient arrives here with a valid session because both apps
      // share Firebase Auth. Sign them out of the doctor context rather than
      // routing them into doctor onboarding.
      if (status === "not-a-doctor") {
        void signOut().finally(() => router.replace("/login?denied=1"));
        return;
      }
      // Returning + authenticated → route by status
      if (status === "new" || status === "onboarding") router.replace("/doc/onboarding");
      else if (status === "pending") router.replace("/doc/verification-pending");
      else router.replace("/doc/dashboard");
      return;
    }
    if (welcomed) {
      router.replace("/login?as=doctor");
      return;
    }
    setReady(true);
  }, [user, status, loading, router, signOut]);

  const handleGetStarted = () => {
    if (typeof window !== "undefined") localStorage.setItem(WELCOMED_KEY, "1");
    router.push("/login?as=doctor");
  };

  // Show the loader for the whole pre-routing tick: loading=true initially,
  // and even after auth resolves we're about to router.replace() to the right
  // destination. Without a spinner here the splash flashes as a blank slate
  // background before the redirect kicks in.
  if (!ready) {
    return <PageLoader />;
  }

  return (
    <div className="mesh-gradient relative grid h-[100dvh] grid-rows-[1fr_auto] overflow-hidden">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-white/20 blur-3xl" />

      <div className="relative flex flex-col items-center justify-center px-6 text-center text-white">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 120 }}
          className="grid h-24 w-24 place-items-center rounded-[28px] bg-white/15 text-3xl shadow-2xl shadow-black/20 backdrop-blur-xl md:h-28 md:w-28"
        >
          <FaStethoscope />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-8 text-4xl font-black tracking-tight md:text-5xl"
        >
          Soocher
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5 }}
          className="mt-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80"
        >
          for Doctors
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-8 max-w-xs text-base leading-relaxed text-white/90 md:max-w-sm md:text-lg"
        >
          Run your practice from your pocket. Appointments, patients, and
          consultations — all in one place.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="relative px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6"
      >
        <div className="mx-auto w-full max-w-md">
          <Button
            size="lg"
            onPress={handleGetStarted}
            endContent={<FaArrowRight />}
            className="h-14 w-full rounded-2xl bg-white font-bold text-primary shadow-2xl shadow-black/20"
          >
            Get Started
          </Button>
          <p className="mt-4 text-center text-xs text-white/80">
            By continuing, you agree to our Terms & Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
