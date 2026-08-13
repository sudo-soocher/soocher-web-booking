"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import en from "./en.json";
import ml from "./ml.json";

export type Lang = "en" | "ml";

export const LANGUAGES: { code: Lang; label: string; englishLabel: string }[] = [
  { code: "en", label: "English", englishLabel: "English" },
  { code: "ml", label: "മലയാളം", englishLabel: "Malayalam" },
];

const STORAGE_KEY = "soocher_lang";

type Dictionary = Record<string, string>;
const DICTIONARIES: Record<Lang, Dictionary> = { en, ml };

/**
 * `useLayoutEffect` warns when React renders on the server. Falling back to
 * `useEffect` there is safe because the server never runs either one to
 * completion — only the client's pre-paint timing matters here.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function readStoredLang(): Lang | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "en" || raw === "ml" ? raw : null;
  } catch {
    // Storage can be blocked; English is the documented default.
    return null;
  }
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start from English. Every route is statically prerendered, so the
  // server HTML is English and the hydration pass must match it exactly —
  // reading localStorage during render would mismatch every text node.
  const [lang, setLangState] = useState<Lang>("en");

  // Runs before the browser paints, so a Malayalam user never sees an English
  // frame even though the markup they received was English.
  useIsomorphicLayoutEffect(() => {
    const stored = readStoredLang();
    if (stored && stored !== "en") setLangState(stored);
  }, []);

  // Drives the Malayalam font rule in globals.css and screen-reader pronunciation.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference simply won't persist; the current session still switches.
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      // Fall back through Malayalam → English → the key itself, so a missing
      // translation degrades to readable English rather than a blank or "a.b.c".
      const raw = DICTIONARIES[lang][key] ?? DICTIONARIES.en[key] ?? key;
      if (!params) return raw;
      return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match
      );
    },
    [lang]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

function useLanguageContext(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}

/** Text lookup: `const { t } = useTranslation()`. */
export function useTranslation(): LanguageContextValue {
  return useLanguageContext();
}

/** Current language and setter, for the switcher itself. */
export function useLanguage(): Pick<LanguageContextValue, "lang" | "setLang"> {
  const { lang, setLang } = useLanguageContext();
  return { lang, setLang };
}
