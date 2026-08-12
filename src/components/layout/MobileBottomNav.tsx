"use client";

import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();

  const isHidden = HIDDEN_ROUTES.some((r) => pathname.startsWith(r));
  if (isHidden) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      aria-label="Bottom navigation"
    >
      <div
        className="bg-white/88 backdrop-blur-3xl border-t border-slate-100/70 rounded-t-[28px] shadow-[0_-2px_28px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Tab bar */}
        <div className="flex items-center px-3 pt-2 pb-1 gap-0">
          {tabs.map(({ icon: Icon, label, href }) => {
            const isActive =
              href === "/" ? pathname === href : pathname.startsWith(href);

            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-2xl transition-all duration-150 active:scale-90 active:opacity-60 select-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Pill indicator behind icon when active */}
                <div
                  className={`w-14 h-[34px] rounded-full flex items-center justify-center transition-all duration-200 ${
                    isActive ? "bg-primary/12" : ""
                  }`}
                >
                  <Icon
                    className={`text-[20px] transition-all duration-200 ${
                      isActive ? "text-primary scale-110" : "text-slate-400"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold leading-tight transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* iOS home indicator */}
        <div className="flex justify-center pb-1.5 pt-0.5">
          <div className="w-32 h-[5px] bg-slate-800/[0.12] rounded-full" />
        </div>
      </div>
    </nav>
  );
}
