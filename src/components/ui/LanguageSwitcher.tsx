"use client";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { FaCheck, FaGlobe } from "react-icons/fa";
import { LANGUAGES, useLanguage, useTranslation } from "@/i18n/LanguageProvider";

interface LanguageSwitcherProps {
  /**
   * "icon"  — round icon button, for the mobile top bar and desktop navbar.
   * "row"   — full-width labelled row, for the profile settings card.
   */
  variant?: "icon" | "row";
  className?: string;
}

export function LanguageSwitcher({
  variant = "icon",
  className,
}: LanguageSwitcherProps) {
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();
  const active = LANGUAGES.find((item) => item.code === lang) ?? LANGUAGES[0];

  const menu = (
    <DropdownMenu
      aria-label={t("lang.switch")}
      variant="flat"
      className="p-2"
      selectionMode="single"
      selectedKeys={[lang]}
      onAction={(key) => setLang(key as typeof lang)}
    >
      {LANGUAGES.map((item) => (
        <DropdownItem
          key={item.code}
          className="rounded-lg"
          textValue={item.englishLabel}
          endContent={
            item.code === lang ? (
              <FaCheck className="text-[11px] text-primary" aria-hidden="true" />
            ) : null
          }
        >
          <span className="font-semibold text-slate-800">{item.label}</span>
          {item.code !== "en" && (
            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {item.englishLabel}
            </span>
          )}
        </DropdownItem>
      ))}
    </DropdownMenu>
  );

  if (variant === "row") {
    return (
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <button
            type="button"
            aria-label={t("lang.switch")}
            className={`flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white/70 px-4 py-3 text-left transition-colors hover:bg-white ${className ?? ""}`}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FaGlobe className="text-sm" aria-hidden="true" />
              </span>
              <span className="text-xs font-extrabold text-slate-700">
                {t("lang.label")}
              </span>
            </span>
            <span className="text-xs font-bold text-slate-500">
              {active.label}
            </span>
          </button>
        </DropdownTrigger>
        {menu}
      </Dropdown>
    );
  }

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <button
          type="button"
          aria-label={t("lang.switch")}
          className={`mobile-pressable flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-primary shadow-sm transition-colors hover:bg-slate-200 ${className ?? ""}`}
        >
          {/* The active language's own script is a faster cue than a globe:
              "മ" when Malayalam is on, "A" when English is. */}
          <span className="text-lg font-black leading-none" aria-hidden="true">
            {lang === "ml" ? "മ" : "A"}
          </span>
        </button>
      </DropdownTrigger>
      {menu}
    </Dropdown>
  );
}
