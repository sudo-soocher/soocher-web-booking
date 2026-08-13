"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaStethoscope, FaCalendarCheck, FaUser } from "react-icons/fa";

const tabs = [
  { icon: FaHome, label: "Home", href: "/" },
  { icon: FaStethoscope, label: "Find", href: "/doctors" },
  { icon: FaCalendarCheck, label: "Bookings", href: "/bookings" },
  { icon: FaUser, label: "Profile", href: "/profile" },
];

const HIDDEN_ROUTES = ["/login", "/video-call", "/native-auth"];

export function MobileBottomNav() {
  const pathname = usePathname();

  const isHidden = HIDDEN_ROUTES.some((r) => pathname.startsWith(r));
  if (isHidden) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pointer-events-none"
      aria-label="Bottom navigation"
    >
      <div
        className="pointer-events-auto max-w-md mx-auto mb-2 bg-white/72 backdrop-blur-3xl border border-white/80 rounded-[28px] shadow-[0_18px_50px_rgba(46,109,212,0.14)]"
        style={{ marginBottom: "max(8px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center px-2 py-2 gap-0">
          {tabs.map(({ icon: Icon, label, href }) => {
            const isActive =
              href === "/" ? pathname === href : pathname.startsWith(href);

            return (
              // <Link prefetch> instead of router.push: the nav is on screen at
              // all times, so Next downloads all four route chunks in the
              // background. Tapping then swaps to a chunk that is already local
              // rather than starting a ~350 kB download at tap time — that
              // download was the multi-second wait before anything appeared.
              <Link
                key={href}
                href={href}
                prefetch
                className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-2xl transition-all duration-150 active:scale-90 active:opacity-60 select-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Pill indicator behind icon when active */}
                <div
                  className={`w-12 h-8 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isActive ? "bg-primary/10 shadow-inner" : ""
                  }`}
                >
                  <Icon
                    className={`text-[18px] transition-all duration-200 ${
                      isActive ? "text-primary scale-105" : "text-slate-500"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold leading-tight transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
}
