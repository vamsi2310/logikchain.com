import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { dictionaries, interpolate, LOCALES, type Locale } from "@/i18n/strings";

const KEY = "lc.locale";

function detect(): Locale {
  const stored = localStorage.getItem(KEY);
  if (stored && stored in dictionaries) return stored as Locale;
  const nav = navigator.language.slice(0, 2);
  if (nav in dictionaries) return nav as Locale;
  return "en";
}

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detect);
  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem(KEY, l);
    setLocaleState(l);
    document.documentElement.lang = l === "en" ? "en-IN" : `${l}-IN`;
  }, []);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dictionaries[locale] ?? dictionaries.en;
      const raw = dict[key] ?? dictionaries.en[key] ?? key;
      return interpolate(raw, vars);
    },
    [locale],
  );
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): LocaleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n");
  return ctx;
}

export { LOCALES };
