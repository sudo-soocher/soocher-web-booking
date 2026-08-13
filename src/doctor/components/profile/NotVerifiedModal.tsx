"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaLock, FaTimes } from "react-icons/fa";
import { Button } from "@/doctor/components/ui/Button";

interface NotVerifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotVerifiedModal({ isOpen, onClose }: NotVerifiedModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="not-verified-title"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 240 }}
            className="relative z-10 w-full max-w-md rounded-[32px] bg-white p-6 shadow-2xl shadow-primary/25 md:p-8"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <FaTimes className="text-xs" />
            </button>

            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm">
              <FaLock className="text-lg" />
            </div>

            <h2
              id="not-verified-title"
              className="mt-5 text-xl font-bold tracking-tight text-slate-900 md:text-2xl"
            >
              Profile not verified yet
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Editing unlocks once our team approves your submission. You&apos;ll get
              a notification as soon as you&apos;re verified — usually within 24–48
              hours.
            </p>

            <div className="mt-5 rounded-2xl bg-primary-50/60 p-4 text-xs leading-relaxed text-primary-700">
              You can still view exactly what we&apos;re reviewing from your profile
              page.
            </div>

            <div className="mt-6">
              <Button
                color="primary"
                size="lg"
                onPress={onClose}
                className="h-12 w-full rounded-full font-semibold shadow-2xl shadow-primary/25"
              >
                Got it
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
