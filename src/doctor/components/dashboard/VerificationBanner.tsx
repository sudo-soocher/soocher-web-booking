"use client";

import React from "react";
import Link from "next/link";
import { FaArrowRight, FaHourglassHalf } from "react-icons/fa";
import { useAuth } from "@/doctor/lib/auth";

/** Renders a "Pending verification" notice while admins are reviewing the profile. */
export function VerificationBanner() {
  const { status } = useAuth();
  if (status !== "pending") return null;

  return (
    <div className="mb-6 rounded-3xl border border-amber-200/60 bg-amber-50 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <FaHourglassHalf />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-amber-900">
            Your profile is under review
          </div>
          <div className="mt-0.5 text-xs leading-relaxed text-amber-800 md:text-sm">
            We&apos;ll verify your details within 48 hours and WhatsApp you the
            moment patients can start booking.
          </div>
        </div>
      </div>
      <Link
        href="/doc/profile/preview"
        className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-amber-900 transition hover:bg-amber-100/50"
      >
        <span>View submitted profile</span>
        <FaArrowRight className="text-xs" />
      </Link>
    </div>
  );
}
