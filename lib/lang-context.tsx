"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { t as tFn, type Lang, type UiKey } from "@/lib/i18n";

const LANG_KEY = "vpqa_lang";

interface LangContextValue {
  lang: Lang;
  toggleLang: () => void;
  /** Pre-bound translation helper — no need to pass `lang` at call sites */
  t: (key: UiKey) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  toggleLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY) as Lang | null;
      if (stored === "en" || stored === "zh") setLang(stored);
    } catch { /* ignore */ }
  }, []);

  function toggleLang() {
    setLang(prev => {
      const next: Lang = prev === "en" ? "zh" : "en";
      try { localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <LangContext.Provider value={{ lang, toggleLang, t: (key) => tFn(key, lang) }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLanguage(): LangContextValue {
  return useContext(LangContext);
}
