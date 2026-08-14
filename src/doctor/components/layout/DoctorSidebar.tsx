"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaSignOutAlt } from "react-icons/fa";
import { Logo } from "@/doctor/components/ui/Logo";
import { useAuth } from "@/doctor/lib/auth";
import { MAIN_TABS } from "@/doctor/components/layout/BottomNav";
import { useStreamChat } from "@/doctor/components/chat/StreamChatContext";

/** Desktop-only sidebar. Mobile users navigate via BottomNav. */
export const DoctorSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { unreadCount } = useStreamChat();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-100 lg:bg-white">
      <div className="flex h-full flex-col gap-2 p-4">
        <div className="px-2 py-4">
          <Logo size="md" showLabel />
        </div>

        <nav className="mt-4 flex flex-col gap-1">
          {MAIN_TABS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${active ? "active" : ""}`}
              >
                <Icon className="text-[15px]" />
                <span className="text-sm">{item.label}</span>
                {item.href === "/doc/messages" && unreadCount > 0 && (
                  <span
                    className="ml-auto grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black leading-none text-white shadow-sm"
                    aria-label={`${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button
            onClick={handleSignOut}
            className="sidebar-item w-full text-left text-slate-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <FaSignOutAlt className="text-[15px]" />
            <span className="text-sm">Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
