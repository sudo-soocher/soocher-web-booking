"use client";

import React from "react";
import Link from "next/link";
import { FaBell } from "react-icons/fa";
import { useStreamChat } from "@/doctor/components/chat/StreamChatContext";

/**
 * The single notification-bell button used in every doctor mobile page
 * header, so its size, style, and badge behavior stay identical everywhere
 * it appears rather than drifting per-page.
 */
export function DoctorNotificationBell({ className = "" }: { className?: string }) {
  const { unreadCount } = useStreamChat();
  return (
    <Link
      href="/doc/messages"
      className={`doctor-tap relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
      aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
    >
      <FaBell className="text-sm" />
      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-[#F5F7FA] bg-rose-500 px-1 text-[11px] font-black leading-none text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
