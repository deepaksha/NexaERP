"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, isSupportedLocale, SupportedLocale, TranslationDictionary, translations, translatePhrase } from "@/lib/i18n";

type LocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (nextLocale: SupportedLocale) => void;
  t: TranslationDictionary;
  tx: (value: string) => string;
};

const LOCALE_STORAGE_KEY = "nexaerp-locale";

const LocaleContext = createContext<LocaleContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  t: translations[defaultLocale],
  tx: (value) => value,
});

function resolveBrowserLocale(): SupportedLocale {
  if (typeof navigator === "undefined") {
    return defaultLocale;
  }

  const language = navigator.language?.slice(0, 2)?.toLowerCase();
  return isSupportedLocale(language) ? language : defaultLocale;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);

  useEffect(() => {
    const persisted = localStorage.getItem(LOCALE_STORAGE_KEY);

    if (isSupportedLocale(persisted)) {
      setLocaleState(persisted);
      document.documentElement.lang = persisted;
      return;
    }

    const browserLocale = resolveBrowserLocale();
    setLocaleState(browserLocale);
    document.documentElement.lang = browserLocale;
  }, []);

  const setLocale = (nextLocale: SupportedLocale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
    setLocaleState(nextLocale);
  };

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t: translations[locale],
      tx: (value: string) => translatePhrase(locale, value),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
