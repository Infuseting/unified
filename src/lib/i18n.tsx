"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "../locales/en.json";
import fr from "../locales/fr.json";

export type Locale = "en" | "fr";

type Translations = Record<string, string>;

const LOCALES: Record<Locale, Translations> = {
  en,
  fr,
};

type I18nContext = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContext | undefined>(undefined);

function detectDefaultLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language || (navigator as any).userLanguage || "en";
  return lang.startsWith("fr") ? "fr" : "en";
}

export function TranslationProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const STORAGE_KEY = "unified:locale";

  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? detectDefaultLocale());

  // wrapper to set state and persist
  const setLocale = (l: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch (e) {
      // noop
    }
    setLocaleState(l);
  };

  // read persisted locale on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && (stored === "en" || stored === "fr")) {
        setLocaleState(stored);
      }
    } catch (e) {
      // noop
    }
  }, []);

  // Keep html lang in sync
  useEffect(() => {
    try {
      document.documentElement.lang = locale;
    } catch (e) {
      // noop
    }
  }, [locale]);

  const t = useMemo(() => {
    return (key: string) => {
      return LOCALES[locale][key] ?? key;
    };
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used inside TranslationProvider");
  return ctx;
}

export default TranslationProvider;
