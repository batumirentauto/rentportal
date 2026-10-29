"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Language, TranslationKey } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "ru",
  setLanguage: () => {},
  t: (key: TranslationKey) => translations.ru[key] || String(key),
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("ru");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get("lang")?.toLowerCase();
    const urlUser = params.get("user") ? decodeURIComponent(params.get("user")!).toLowerCase() : "";

    // 1. If explicit lang in URL
    if (urlLang === "ka") {
      setLanguageState("ka");
      localStorage.setItem("rentportal_language", "ka");
      return;
    }
    if (urlLang === "ru") {
      setLanguageState("ru");
      localStorage.setItem("rentportal_language", "ru");
      return;
    }

    // 2. Specific rule for Bacho (Бачо / Bacho in Tbilisi): automatically switch to Georgian
    if (urlUser.includes("бачо") || urlUser.includes("bacho") || urlUser.includes("ბაჩო")) {
      setLanguageState("ka");
      localStorage.setItem("rentportal_language", "ka");
      return;
    }

    // 3. Stored preference
    const savedLang = localStorage.getItem("rentportal_language") as Language | null;
    if (savedLang === "ka" || savedLang === "ru") {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("rentportal_language", lang);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const dict = translations[language] || translations.ru;
    return dict[key] || fallback || translations.ru[key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
