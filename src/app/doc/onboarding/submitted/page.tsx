"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaCheckCircle, FaWhatsapp } from "react-icons/fa";
import { Button } from "@/doctor/components/ui/Button";
import { useAuth } from "@/doctor/lib/auth";

export default function OnboardingSubmittedPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <div className="flex h-[100dvh] flex-col overflow-y-auto overscroll-y-contain bg-[#F8FAFC] lg:h-auto lg:min-h-[100dvh] lg:overflow-visible">
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 140, delay: 0.1 }}
          className="grid h-24 w-24 place-items-center rounded-[28px] bg-emerald-50 text-emerald-600 shadow-2xl shadow-emerald-500/20"
        >
          <FaCheckCircle className="text-3xl" />
        </motion.div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          You're all set!
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
          We've received your profile. Our team will verify your details within{" "}
          <span className="font-bold text-slate-900">48 hours</span>.
        </p>

        <div className="premium-card mt-8 w-full p-5 text-left">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FaWhatsapp />
            </div>
            <div className="text-sm">
              <div className="font-bold text-slate-900">We'll WhatsApp you</div>
              <div className="text-xs text-slate-500">
                The moment your profile is approved, you'll get a message on your registered number.
              </div>
            </div>
          </div>
        </div>

        <Button
          color="primary"
          size="lg"
          onPress={async () => {
            await signOut();
            router.replace("/login");
          }}
          variant="bordered"
          className="mt-8 h-14 w-full rounded-2xl border-2 border-slate-200 font-bold text-slate-700"
        >
          Sign out
        </Button>
      </motion.main>
    </div>
  );
}
