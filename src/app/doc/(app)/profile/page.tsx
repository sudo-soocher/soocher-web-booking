"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FaUserMd,
  FaRegClock,
  FaWallet,
  FaShieldAlt,
  FaSignOutAlt,
  FaArrowRight,
  FaUsers,
  FaEye,
  FaLock,
} from "react-icons/fa";
import { VerificationBanner } from "@/doctor/components/dashboard/VerificationBanner";
import { NotVerifiedModal } from "@/doctor/components/profile/NotVerifiedModal";
import { useAuth } from "@/doctor/lib/auth";
import type { IconType } from "react-icons";

interface MenuItem {
  label: string;
  hint?: string;
  href: string;
  icon: IconType;
  /** When true, the item is disabled for unverified doctors and shows the NotVerifiedModal. */
  requiresVerified?: boolean;
}

const SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: "Practice",
    items: [
      { label: "View submitted profile", hint: "What our team is reviewing", href: "/doc/profile/preview", icon: FaEye },
      { label: "Edit profile", hint: "Bio, expertise, schedule, fees", href: "/doc/profile/edit", icon: FaUserMd, requiresVerified: true },
      { label: "Schedule settings", hint: "Availability, slots, buffer", href: "/doc/profile/edit/schedule", icon: FaRegClock, requiresVerified: true },
      { label: "Finance", hint: "Fees, payouts, statements", href: "/doc/profile/edit/finance", icon: FaWallet, requiresVerified: true },
      { label: "My patients", hint: "Directory & records", href: "/doc/patients", icon: FaUsers },
    ],
  },
  {
    title: "App",
    items: [
      { label: "Account & security", hint: "Username, password, sessions", href: "/doc/profile/account", icon: FaShieldAlt },
    ],
  },
];

export default function ProfilePage() {
  const { user, profile, status, signOut } = useAuth();
  const router = useRouter();
  const [showNotVerified, setShowNotVerified] = useState(false);
  const isVerified = status === "verified";

  const name =
    (profile?.fullName as string) ||
    (profile?.name as string) ||
    user?.displayName ||
    "Doctor";
  const speciality =
    (profile?.primarySpeciality as string) || "Speciality not set";
  const photo = profile?.profilePhotoUrl as string | undefined;

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
<h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Profile
        </h1>
      </motion.div>

      <div className="mt-5">
        <VerificationBanner />
      </div>

      {/* Identity card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="premium-card mt-4 flex items-center gap-4 p-5 md:p-6"
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-primary-100">
          {photo ? (
            <Image src={photo} alt={name} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="grid h-full w-full place-items-center text-primary">
              <FaUserMd className="text-xl" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-black text-slate-900">
            Dr. {name}
          </div>
          <div className="truncate text-xs text-slate-500 md:text-sm">{speciality}</div>
          <div className="mt-1 truncate text-[11px] text-slate-400">
            {user?.email || user?.phoneNumber}
          </div>
        </div>
      </motion.div>

      {/* Sections */}
      {SECTIONS.map((section, sIdx) => (
        <motion.section
          key={section.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + sIdx * 0.05 }}
          className="mt-6"
        >
          <h2 className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            {section.title}
          </h2>
          <div className="mt-2 overflow-hidden rounded-3xl border border-slate-100 bg-white">
            {section.items.map((item, i) => {
              const Icon = item.icon;
              const locked = item.requiresVerified && !isVerified;
              const rowClass = `flex items-center gap-4 px-4 py-3.5 transition hover:bg-primary-50/60 ${
                i !== section.items.length - 1 ? "border-b border-slate-100" : ""
              }`;
              const content = (
                <>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
                    <Icon className="text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-slate-900">{item.label}</div>
                      {locked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                          <FaLock className="text-[8px]" />
                          Locked
                        </span>
                      )}
                    </div>
                    {item.hint && (
                      <div className="truncate text-xs text-slate-500">{item.hint}</div>
                    )}
                  </div>
                  <FaArrowRight className="text-xs text-slate-300" />
                </>
              );

              if (locked) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setShowNotVerified(true)}
                    className={`${rowClass} w-full text-left`}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link key={item.label} href={item.href} className={rowClass}>
                  {content}
                </Link>
              );
            })}
          </div>
        </motion.section>
      ))}

      {/* Sign out */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-3xl border border-rose-100 bg-white px-4 py-4 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50"
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <FaSignOutAlt className="text-sm" />
          </div>
          Sign out
        </button>
      </motion.div>

      <p className="mt-8 text-center text-xs text-slate-400">Soocher for Doctors · v0.1.0</p>

      <NotVerifiedModal
        isOpen={showNotVerified}
        onClose={() => setShowNotVerified(false)}
      />
    </div>
  );
}
