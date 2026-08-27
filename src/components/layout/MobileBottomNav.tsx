"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FaHome, FaStethoscope, FaCalendarCheck, FaUser } from "react-icons/fa";
import { useTranslation } from "@/i18n/LanguageProvider";

const tabs = [
  { icon: FaHome, labelKey: "nav.home", href: "/" },
  { icon: FaStethoscope, labelKey: "nav.find", href: "/doctors" },
  { icon: FaCalendarCheck, labelKey: "nav.bookings", href: "/bookings" },
  { icon: FaUser, labelKey: "nav.profile", href: "/profile" },
];

/**
 * `/doc` is the whole doctor app. It ships its own chrome — DoctorSidebar and
 * its own BottomNav, mounted in src/app/doc/(app)/layout.tsx — so the patient
 * tabs must never render there.
 *
 * This component lives in the ROOT layout, which means it paints over every
 * route unless excluded here. Without `/doc`: onboarding showed the patient tabs
 * (Home / Find / Bookings / Profile) on a doctor screen, and the authenticated
 * doctor pages stacked two bottom navs on top of each other.
 */
const HIDDEN_ROUTES = ["/login", "/video-call", "/native-auth", "/booking-complete", "/doc"];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Match whole path segments, not raw prefixes. A plain `startsWith("/doc")`
  // would also swallow the patient routes `/doctors` and `/doctor/[id]` and
  // strip the tabs off pages that need them.
  const isHidden = HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  // The Flutter app now renders its own native bottom nav (see
  // soocher_webview_bridge.dart's soocherUserAgent) — this one must not
  // double up underneath it. Browser/PWA users never send this UA, so this
  // is a no-op for them.
  const isInApp =
    typeof navigator !== "undefined" && navigator.userAgent.includes("SoocherApp");
  if (isHidden || isInApp || !mounted) return null;

  return createPortal(
    <nav
      className="patient-bottom-nav fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      aria-label={t("nav.bottomNav")}
    >
      <ul
        className="flex w-full max-w-sm items-center justify-around rounded-[28px] border border-white/40 bg-white/60 px-2 py-1.5 shadow-xl shadow-black/10 backdrop-blur-2xl"
      >
        {tabs.map(({ icon: Icon, labelKey, href }) => {
          const label = t(labelKey);
          const isActive =
            href === "/" ? pathname === href : pathname.startsWith(href);

          return (
            <li key={href} className="relative flex-1">
              <Link
                href={href}
                prefetch
                className="flex min-w-0 select-none flex-col items-center justify-center gap-0.5 overflow-hidden py-2 transition-transform active:scale-95"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="patient-bottomnav-active"
                    className="absolute inset-x-1 inset-y-0 rounded-2xl bg-primary/10"
                    transition={{ type: "spring", damping: 24, stiffness: 300 }}
                  />
                )}
                <span className="relative">
                  <Icon
                    className={`text-[22px] transition-colors ${
                      isActive ? "text-primary" : "text-slate-400"
                    }`}
                  />
                </span>
                <span
                  className={`relative block h-3 w-full max-w-full truncate px-0.5 text-center text-[9px] font-bold leading-3 tracking-wide transition-colors ${
                    isActive ? "text-primary" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>,
    document.body
  );
}
