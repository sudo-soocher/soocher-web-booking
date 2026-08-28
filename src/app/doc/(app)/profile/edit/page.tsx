"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Chip } from "@heroui/react";
import {
  FaArrowRight,
  FaGraduationCap,
  FaLanguage,
  FaLock,
  FaMedal,
  FaMoneyBillWave,
  FaRegClock,
  FaStethoscope,
  FaTools,
  FaUserMd,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import { useAuth } from "@/doctor/lib/auth";
import { DoctorPageShimmer } from "@/doctor/components/ui/DoctorShimmer";
import type {
  AchievementItem,
  DayKey,
  EducationItem,
  ExperienceItem,
  ExpertiseItem,
  WeeklyTimeSlots,
} from "@/doctor/types/doctor";

interface EditableSection {
  slug: string;
  label: string;
  icon: IconType;
  summary: (p: Record<string, unknown>) => string;
}

const SHORT_DAYS: Record<DayKey, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};
const DAY_ORDER: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const SECTIONS: EditableSection[] = [
  {
    slug: "speciality",
    label: "Speciality",
    icon: FaStethoscope,
    summary: (p) => {
      const primary = (p.primarySpeciality as string) || "Not set";
      const yrs = p.yearsOfExperience as number | undefined;
      return yrs != null ? `${primary} · ${yrs} yrs` : primary;
    },
  },
  {
    slug: "expertise",
    label: "Expertise & procedures",
    icon: FaTools,
    summary: (p) => {
      const items = (p.expertiseItems as ExpertiseItem[]) || [];
      if (items.length === 0) return "Not added";
      return `${items.length} item${items.length === 1 ? "" : "s"}`;
    },
  },
  {
    slug: "about",
    label: "About (bio, approach)",
    icon: FaUserMd,
    summary: (p) => {
      const bio = ((p.bio as string) || "").trim();
      if (!bio) return "Not written";
      return bio.length > 60 ? `${bio.slice(0, 60)}…` : bio;
    },
  },
  {
    slug: "education",
    label: "Education & training",
    icon: FaGraduationCap,
    summary: (p) => {
      const items = (p.education as EducationItem[]) || [];
      if (items.length === 0) return "Not added";
      return `${items.length} qualification${items.length === 1 ? "" : "s"}`;
    },
  },
  {
    slug: "experience",
    label: "Work experience",
    icon: FaUserMd,
    summary: (p) => {
      const items = (p.workExperience as ExperienceItem[]) || [];
      if (items.length === 0) return "Not added";
      return `${items.length} position${items.length === 1 ? "" : "s"}`;
    },
  },
  {
    slug: "achievements",
    label: "Achievements",
    icon: FaMedal,
    summary: (p) => {
      const items = (p.achievements as AchievementItem[]) || [];
      if (items.length === 0) return "None added";
      return `${items.length} achievement${items.length === 1 ? "" : "s"}`;
    },
  },
  {
    slug: "languages",
    label: "Languages spoken",
    icon: FaLanguage,
    summary: (p) => {
      const langs = (p.languages as string[]) || [];
      if (langs.length === 0) return "Not added";
      if (langs.length <= 3) return langs.join(", ");
      return `${langs.slice(0, 3).join(", ")} +${langs.length - 3}`;
    },
  },
  {
    slug: "schedule",
    label: "Consultation schedule",
    icon: FaRegClock,
    summary: (p) => {
      const slots = p.timeSlots as WeeklyTimeSlots | undefined;
      if (!slots) return "Not set";
      const on = DAY_ORDER.filter((k) => slots[k]?.enabled);
      if (on.length === 0) return "No days selected";
      return on.map((k) => SHORT_DAYS[k]).join(" · ");
    },
  },
  {
    slug: "finance",
    label: "Fees & payout",
    icon: FaMoneyBillWave,
    summary: (p) => {
      const v = p.videoConsultFee as number | undefined;
      const c = p.chatFee as number | undefined;
      const f = p.followUpFee as number | undefined;
      if (v == null && c == null && f == null) return "Not set";
      return `Video ₹${v ?? "—"} · Chat ₹${c ?? "—"} · Follow-up ₹${f ?? "—"}`;
    },
  },
];

const LOCKED_SECTIONS: { label: string; hint: string }[] = [
  { label: "Basic info", hint: "Name, DOB, gender, location" },
  { label: "Contact details", hint: "Email, mobile, WhatsApp" },
  { label: "Medical licence", hint: "Registration, Aadhaar, document" },
];

export default function ProfileEditHubPage() {
  const router = useRouter();
  const { profile, status, loading } = useAuth();

  // Hard gate: only verified doctors can be here.
  useEffect(() => {
    if (loading) return;
    if (status && status !== "verified") {
      router.replace("/doc/profile");
    }
  }, [status, loading, router]);

  if (loading || status !== "verified") {
    return <DoctorPageShimmer compact />;
  }

  const p = (profile || {}) as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-3xl pb-12">
      {/* Header */}
      <div className="flex items-center justify-start gap-3">
        <Chip variant="flat" color="primary" className="text-[11px]">
          Verified · editable
        </Chip>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5"
      >
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Edit profile
        </h1>
        <p className="mt-2 text-sm text-slate-600 md:text-base">
          Update the parts of your profile patients see. Identity details stay
          locked to keep your verification valid.
        </p>
      </motion.div>

      {/* Editable sections */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6"
      >
        <h2 className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Editable
        </h2>
        <div className="mt-2 overflow-hidden rounded-3xl border border-slate-100 bg-white">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.slug}
                href={`/doc/profile/edit/${s.slug}`}
                className={`flex items-center gap-4 px-4 py-3.5 transition hover:bg-primary-50/60 ${
                  i !== SECTIONS.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
                  <Icon className="text-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{s.label}</div>
                  <div className="truncate text-xs text-slate-500">{s.summary(p)}</div>
                </div>
                <FaArrowRight className="text-xs text-slate-300" />
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* Locked sections */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        <h2 className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Locked
        </h2>
        <div className="mt-2 overflow-hidden rounded-3xl border border-slate-100 bg-white">
          {LOCKED_SECTIONS.map((s, i) => (
            <div
              key={s.label}
              className={`flex items-center gap-4 px-4 py-3.5 ${
                i !== LOCKED_SECTIONS.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <FaLock className="text-xs" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900">{s.label}</div>
                <div className="truncate text-xs text-slate-500">{s.hint}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 px-1 text-xs leading-relaxed text-slate-500">
          These details are tied to your verification. To change them, please
          contact support.
        </p>
      </motion.section>
    </div>
  );
}
