"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translate, type Locale, type MessageKey } from "@/lib/i18n";

const STORAGE_KEY = "locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "zh",
  setLocale: () => {},
  t: (key) => translate("zh", key),
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    const browserIsZh =
      typeof navigator !== "undefined" &&
      (navigator.language || "").toLowerCase().startsWith("zh");
    // Default is Chinese per product requirement; only honor an explicit
    // stored choice, otherwise fall back to Chinese even for non-CN browsers.
    const initial: Locale = stored === "en" || stored === "zh" ? stored : "zh";
    setLocaleState(initial);
    document.documentElement.lang = initial === "zh" ? "zh-CN" : "en";
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale, mounted]);

  const setLocale = (l: Locale) => setLocaleState(l);
  const t = (key: MessageKey, params?: Record<string, string | number>) =>
    translate(locale, key, params);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}
