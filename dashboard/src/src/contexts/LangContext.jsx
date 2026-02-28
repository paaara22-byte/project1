import { createContext, useContext, useState, useCallback } from "react";
import { translations, defaultLang } from "../i18n/translations";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(defaultLang);

  const t = useCallback(
    (key) => {
      return translations[lang]?.[key] ?? translations[defaultLang]?.[key] ?? key;
    },
    [lang]
  );

  const setLanguage = useCallback((l) => {
    setLang(l === "ru" ? "ru" : "kz");
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
