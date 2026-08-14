"use client";

import React from "react";
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
  icon: IconType;
}

export const MAIN_TABS: Tab[] = [
  { href: "/doc/dashboard", label: "Home", icon: FaHome },
  { href: "/doc/consultations", label: "Consultations", icon: FaCalendarCheck },
  { href: "/doc/messages", label: "Messages", icon: FaCommentDots },
  { href: "/doc/profile", label: "Profile", icon: FaUserMd },
];

/** Sticky bottom nav for mobile. Hidden on lg+ (where the sidebar takes over). */
export function BottomNav() {
  const pathname = usePathname() || "";
  const { unreadCount } = useStreamChat();

  // Hide on edit pages — their own sticky Save CTA owns the bottom of the screen.
  if (pathname.startsWith("/doc/profile/edit/")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <ul
        className="flex w-full max-w-sm items-center justify-around rounded-[28px] border border-white/40 bg-white/60 px-2 py-1.5 shadow-xl shadow-black/10 backdrop-blur-2xl"
      >
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="relative flex-1">
              <Link
                href={tab.href}
                className="flex flex-col items-center justify-center gap-0.5 py-2"
              >
                {/* Active pill background */}
                {active && (
                  <motion.span
                    layoutId="bottomnav-active"
                    className="absolute inset-x-1 inset-y-0 rounded-2xl bg-primary/10"
                    transition={{ type: "spring", damping: 24, stiffness: 300 }}
                  />
                )}
                <span className="relative">
                  <Icon
                    className={`text-[22px] transition-colors ${
                      active ? "text-primary" : "text-slate-400"
                    }`}
                  />
                  {tab.href === "/doc/messages" && unreadCount > 0 && (
                    <span
                      className="absolute -right-3 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-black leading-none text-white shadow-sm"
                      aria-label={`${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                <span
                  className={`relative text-[9px] font-bold tracking-wide transition-colors ${
                    active ? "text-primary" : "text-slate-400"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
