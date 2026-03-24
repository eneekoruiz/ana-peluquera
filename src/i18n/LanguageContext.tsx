import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { translations, type Lang } from "./translations";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const detectLanguage = (): Lang => {
  const stored = localStorage.getItem("ag-lang");
  if (stored && ["es", "en", "eu"].includes(stored)) return stored as Lang;
  const browserLang = navigator.language.slice(0, 2).toLowerCase();
  if (browserLang === "eu") return "eu";
  if (browserLang === "en") return "en";
  return "es";
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "es",
  setLang: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(detectLanguage);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("ag-lang", l);
    document.documentElement.lang = l;
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");
      let val: unknown = translations[lang];
      for (const k of keys) {
        if (val && typeof val === "object" && k in val) {
          val = (val as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }
      return typeof val === "string" ? val : key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
