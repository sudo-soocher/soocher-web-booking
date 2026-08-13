"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FaArrowRight,
  FaEnvelope,
  FaEye,
  FaHome,
  FaHourglassHalf,
  FaSignOutAlt,
} from "react-icons/fa";
import { Button } from "@/doctor/components/ui/Button";
import { PageLoader } from "@/doctor/components/ui/PageLoader";
import { useAuth } from "@/doctor/lib/auth";

export default function VerificationPendingPage() {
  const router = useRouter();
  const { user, loading, signOut, refreshProfile, status } = useAuth();

  if (loading) {
    return <PageLoader />;
  }
  if (!user) {
    router.replace("/login");
    return null;
  }
  if (status === "verified") {
    router.replace("/doc/dashboard");
    return null;
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-y-auto overscroll-y-contain bg-[#F8FAFC] lg:h-auto lg:min-h-[100dvh] lg:overflow-visible">
      <header className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <span className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Pending review
        </span>
        <button
          onClick={signOut}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm hover:text-rose-600"
          aria-label="Sign out"
        >
          <FaSignOutAlt />
        </button>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 pb-8 text-center"
      >
        <div className="grid h-20 w-20 place-items-center rounded-[28px] bg-amber-50 text-amber-600 shadow-lg shadow-amber-500/20">
          <FaHourglassHalf className="text-2xl" />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          We&apos;re reviewing your profile.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
          Our team verifies every doctor before they can take patients on Soocher.
          This usually takes <span className="font-bold text-slate-900">24–48 hours</span>.
          We&apos;ll WhatsApp you the moment you&apos;re approved.
        </p>

        {/* Primary action: review what was submitted */}
        <Link
          href="/doc/profile/preview"
          className="mt-8 flex w-full items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-white shadow-2xl shadow-primary/25 transition hover:bg-primary-600"
        >
          <span className="flex items-center gap-3">
            <FaEye />
            View submitted profile
          </span>
          <FaArrowRight className="text-xs" />
        </Link>

        {/* Secondary action: go to the app home */}
        <Link
          href="/doc/dashboard"
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:border-primary-200 hover:text-primary"
        >
          <span className="flex items-center gap-3">
            <FaHome />
            Open the app meanwhile
          </span>
          <FaArrowRight className="text-xs" />
        </Link>

        {/* Identity card */}
        <div className="premium-card mt-8 w-full p-5 text-left">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Signed in as
          </div>
          <div className="mt-1 truncate text-sm font-bold text-slate-900">
            {user.email || user.phoneNumber}
          </div>
        </div>

        <Button
          color="primary"
          size="lg"
          variant="light"
          onPress={refreshProfile}
          className="mt-4 h-12 w-full rounded-2xl font-bold text-primary"
        >
          Refresh status
        </Button>

        <a
          href="mailto:support@soocher.com"
          className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-primary"
        >
          <FaEnvelope className="text-xs" />
          Contact support
        </a>
      </motion.main>
    </div>
  );
}
