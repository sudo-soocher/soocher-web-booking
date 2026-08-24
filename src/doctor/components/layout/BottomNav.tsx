"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  FaHome,
  FaCalendarCheck,
  FaCommentDots,
  FaUserMd,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import { useStreamChat } from "@/doctor/components/chat/StreamChatContext";

interface Tab {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: IconType;
}

export const MAIN_TABS: Tab[] = [
  { href: "/doc/dashboard", label: "Home", mobileLabel: "Home", icon: FaHome },
  { href: "/doc/consultations", label: "Consultations", mobileLabel: "Consultations", icon: FaCalendarCheck },
  { href: "/doc/messages", label: "Messages", icon: FaCommentDots },
  { href: "/doc/profile", label: "Profile", icon: FaUserMd },
];

/** Sticky bottom nav for mobile. Hidden on lg+ (where the sidebar takes over). */
export function BottomNav() {
  const pathname = usePathname() || "";
  const { unreadCount } = useStreamChat();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide on edit pages — their own sticky Save CTA owns the bottom of the screen.
  if (pathname.startsWith("/doc/profile/edit/")) return null;
  if (!mounted) return null;

  const nav = (
    <nav
      className="doctor-bottom-nav fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
    >
      <ul className="flex w-full max-w-sm items-center justify-around rounded-[22px] border border-white/80 bg-white/90 px-1.5 py-1.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="relative flex-1">
              <Link
                href={tab.href}
                prefetch
                aria-label={tab.label}
                className="flex min-h-[52px] flex-col items-center justify-center gap-1 py-1.5 active:scale-95 transition-transform"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {/* Active pill background */}
                {active && (
                  <motion.span
                    layoutId="bottomnav-active"
                    className="absolute inset-x-1 inset-y-0 rounded-2xl bg-primary/10"
                    transition={{ type: "spring", damping: 24, stiffness: 300 }}
                  />
                )}
                <span className="relative grid h-6 w-9 place-items-center">
                  <Icon
                    className={`text-[22px] transition-colors ${
                      active ? "text-primary" : "text-slate-400"
                    }`}
                  />
                  {tab.href === "/doc/messages" && unreadCount > 0 && (
                    <span
                      className="absolute -right-1.5 -top-2 z-10 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[11px] font-black leading-none text-white shadow-sm"
                      aria-label={`${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
                    >
                      {unreadCount > 99 ? "99+" : String(unreadCount)}
                    </span>
                  )}
                </span>
                <span
                  className={`relative whitespace-nowrap text-[8px] font-extrabold tracking-normal transition-colors ${
                    active ? "text-primary" : "text-slate-400"
                  }`}
                >
                  {tab.mobileLabel || tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return createPortal(nav, document.body);
}
