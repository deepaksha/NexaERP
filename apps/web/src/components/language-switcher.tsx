"use client";

import { defaultLocale, supportedLocales, SupportedLocale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

const localeLabels: Record<SupportedLocale, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
      <span>{t.labelLanguage}</span>
      <select
        value={locale || defaultLocale}
        onChange={(event) => setLocale(event.target.value as SupportedLocale)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none transition focus:border-blue-500"
      >
        {supportedLocales.map((localeCode) => (
          <option key={localeCode} value={localeCode}>
            {localeLabels[localeCode]}
          </option>
        ))}
      </select>
    </label>
  );
}
