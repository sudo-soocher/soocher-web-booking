"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FaCalendarCheck,
  FaUsers,
  FaStar,
  FaWallet,
  FaArrowRight,
  FaBell,
  FaHourglassHalf,
} from "react-icons/fa";
import { VerificationBanner } from "@/doctor/components/dashboard/VerificationBanner";
import { useAuth } from "@/doctor/lib/auth";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const STAT_COLORS = [
  { bg: "bg-primary-50",  icon: "text-primary",       value: "text-primary"       },
  { bg: "bg-emerald-50",  icon: "text-emerald-600",   value: "text-emerald-700"   },
  { bg: "bg-amber-50",    icon: "text-amber-600",     value: "text-amber-700"     },
  { bg: "bg-violet-50",   icon: "text-violet-600",    value: "text-violet-700"    },
];

export default function DashboardPage() {
  const { profile, user, status } = useAuth();

  const displayName =
    (profile?.fullName as string) ||
    (profile?.name as string) ||
    user?.displayName ||
    "Doctor";

  const firstName = displayName.split(" ")[0];
  const initials  = getInitials(displayName);
  const verified  = status === "verified";

  const stats = [
    { label: "Today's appointments", value: 0,   icon: FaCalendarCheck },
    { label: "Total patients",        value: 0,   icon: FaUsers          },
    { label: "Avg. rating",           value: "—", icon: FaStar           },
    { label: "Earnings (₹)",          value: "0", icon: FaWallet         },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5 lg:max-w-7xl">

      {/* ── Hero card ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mesh-gradient relative overflow-hidden rounded-3xl p-5 md:p-7"
      >
        {/* Notification bell */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
              {getGreeting()}
            </p>
            <h1 className="mt-0.5 truncate text-2xl font-black tracking-tight text-white md:text-3xl">
              Dr. {firstName}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="#"
              aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            >
              <FaBell className="text-sm" />
            </Link>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 text-sm font-black text-white ring-2 ring-white/30">
              {initials}
            </div>
          </div>
        </div>

        {/* Status pill */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 backdrop-blur">
          <span className={`h-2 w-2 rounded-full ${verified ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <p className="text-xs font-bold text-white">
            {verified ? "Profile verified · Accepting patients" : "Verification pending"}
          </p>
        </div>
      </motion.div>

      {/* ── Verification banner ───────────────────────────── */}
      <VerificationBanner />

      {/* ── Stats grid ───────────────────────────────────── */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Overview
        </p>
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const c = STAT_COLORS[i];
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.07 }}
                className="premium-card p-4 md:p-5"
              >
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${c.bg}`}>
                  <Icon className={`text-base ${c.icon}`} />
                </div>
                <div className={`mt-4 text-3xl font-black tracking-tight ${c.value}`}>
                  {stat.value}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Today's consultations ────────────────────────── */}
      <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="premium-card p-5 md:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 md:text-lg">
                Today's consultations
              </h2>
              <p className="text-xs text-slate-500">Scheduled for today</p>
            </div>
            <Link
              href="/doc/consultations"
              className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary-100"
            >
              See all <FaArrowRight className="text-[10px]" />
            </Link>
          </div>

          <div className="mt-5 grid place-items-center gap-3 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 p-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">
              <FaCalendarCheck className="text-lg text-slate-300" />
            </div>
            <p className="max-w-xs text-sm text-slate-400">
              {status === "pending"
                ? "Once verified, patient bookings will appear here."
                : "No consultations today. Patients will show up as they book."}
            </p>
            <Link
              href="/doc/consultations"
              className="mt-1 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-600"
            >
              View all consultations
            </Link>
          </div>
      </motion.section>

      {/* Pending profile link */}
      {status === "pending" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <Link
            href="/doc/profile/preview"
            className="flex items-center gap-3 rounded-3xl border border-amber-200/60 bg-amber-50 p-4 transition hover:bg-amber-100/60"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <FaHourglassHalf />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900">Profile under review</p>
              <p className="text-xs text-amber-700">Tap to preview your submitted profile</p>
            </div>
            <FaArrowRight className="shrink-0 text-xs text-amber-700" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
