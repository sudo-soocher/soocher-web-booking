"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaRegClock, FaSignOutAlt, FaUserMd } from "react-icons/fa";
import { Logo } from "@/doctor/components/ui/Logo";
import { useAuth } from "@/doctor/lib/auth";
import { MAIN_TABS } from "@/doctor/components/layout/BottomNav";
import { useStreamChat } from "@/doctor/components/chat/StreamChatContext";

/** Desktop-only sidebar. Mobile users navigate via BottomNav. */
export const DoctorSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, profile, user, status } = useAuth();
  const { unreadCount } = useStreamChat();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const displayName =
    (profile?.fullName as string) ||
    (profile?.name as string) ||
    user?.displayName ||
    "Doctor";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const speciality = (profile?.primarySpeciality as string) || "Medical practitioner";

  return (
    <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[276px] lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200/80 lg:bg-white">
      <div className="flex h-full flex-col p-5">
        <div className="px-1 py-2">
          <Logo size="md" showLabel />
        </div>

        <p className="mb-2 mt-8 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
          Workspace
        </p>
        <nav className="flex flex-col gap-1">
          {MAIN_TABS.filter((item) => item.href !== "/doc/profile").map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${active ? "active" : ""}`}
              >
                <Icon className="text-[14px]" />
                <span className="text-[13px] font-semibold">{item.label}</span>
                {item.href === "/doc/messages" && unreadCount > 0 && (
                  <span
                    className="ml-auto inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-black leading-none text-white shadow-sm"
                    aria-label={`${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <p className="mb-2 mt-6 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
          Practice
        </p>
        <nav className="flex flex-col gap-1">
          <Link
            href="/doc/profile/edit/schedule"
            className={`sidebar-item ${pathname?.startsWith("/doc/profile/edit/schedule") ? "active" : ""}`}
          >
            <FaRegClock className="text-[14px]" />
            <span className="text-[13px] font-semibold">Availability</span>
          </Link>
          <Link
            href="/doc/profile"
            className={`sidebar-item ${pathname === "/doc/profile" ? "active" : ""}`}
          >
            <FaUserMd className="text-[14px]" />
            <span className="text-[13px] font-semibold">Practice profile</span>
          </Link>
        </nav>

        <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-xs font-extrabold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold text-slate-900">Dr. {displayName}</p>
              <p className="truncate text-[10px] text-slate-500">{speciality}</p>
            </div>
            <span className={`h-2 w-2 shrink-0 rounded-full ${status === "verified" ? "bg-emerald-500" : "bg-amber-400"}`} />
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[11px] font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <FaSignOutAlt className="text-xs" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
