"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaCheck, FaGlobe } from "react-icons/fa";
import { LANGUAGES, useLanguage, useTranslation } from "@/i18n/LanguageProvider";

interface LanguageSwitcherProps {
  /** Icon for top bars; row for profile settings. */
  variant?: "icon" | "row";
  className?: string;
}

interface MenuPosition {
  left: number;
  top: number;
  width: number;
}

export function LanguageSwitcher({
  variant = "icon",
  className,
}: LanguageSwitcherProps) {
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const active = LANGUAGES.find((item) => item.code === lang) ?? LANGUAGES[0];

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(208, window.innerWidth - margin * 2);
    const estimatedHeight = 116;
    const left = Math.min(
      window.innerWidth - width - margin,
      Math.max(margin, rect.right - width)
    );
    const below = rect.bottom + 8;
    const top =
      below + estimatedHeight <= window.innerHeight - margin
        ? below
        : Math.max(margin, rect.top - estimatedHeight - 8);
    setPosition({ left, top, width });
  }, []);

  const toggle = () => {
    if (!open) positionMenu();
    setOpen((value) => !value);
  };

  useEffect(() => {
    if (!open) return;
    positionMenu();
    const close = () => setOpen(false);
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", close, true);
    };
  }, [open, positionMenu]);

  const trigger =
    variant === "row" ? (
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("lang.switch")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/70 px-4 py-3 text-left transition-colors hover:bg-white ${className ?? ""}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FaGlobe className="text-sm" aria-hidden="true" />
          </span>
          <span className="min-w-0 truncate text-xs font-extrabold text-slate-700">
            {t("lang.label")}
          </span>
        </span>
        <span className="shrink-0 text-xs font-bold text-slate-500">{active.label}</span>
      </button>
    ) : (
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("lang.switch")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={`mobile-pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-primary shadow-sm transition-colors hover:bg-slate-200 ${className ?? ""}`}
      >
        {/* Shows the language a tap switches TO, not the current one — a
            button reading "A" while already in English reads as inert; showing
            the other option reads as an action. */}
        <span className="text-lg font-black leading-none" aria-hidden="true">
          {lang === "ml" ? "A" : "മ"}
        </span>
      </button>
    );

  return (
    <>
      {trigger}
      {open && position && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close language menu"
                className="fixed inset-0 z-[9998] cursor-default bg-transparent"
                onClick={() => setOpen(false)}
              />
              <div
                role="menu"
                aria-label={t("lang.switch")}
                className="fixed z-[9999] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/15 backdrop-blur-xl"
                style={position}
              >
                {LANGUAGES.map((item) => {
                  const selected = item.code === lang;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        setLang(item.code);
                        setOpen(false);
                      }}
                      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                        selected ? "bg-primary/10 text-primary" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="shrink-0 text-sm font-bold">{item.label}</span>
                        {item.code !== "en" && (
                          <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {item.englishLabel}
                          </span>
                        )}
                      </span>
                      <span className="grid h-5 w-5 shrink-0 place-items-center">
                        {selected && <FaCheck className="text-[11px]" aria-hidden="true" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
