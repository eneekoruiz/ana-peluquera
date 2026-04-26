import { useLanguage } from "@/i18n/LanguageContext";
import { langLabels, type Lang } from "@/i18n/translations";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import NProgress from "nprogress";

const langs: Lang[] = ["es", "en", "eu"];

const LanguageSelector = () => {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-sans uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md active:scale-95"
        aria-label="Change language"
      >
        <Globe size={14} />
        <span>{lang.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-50 animate-fade-in">
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => {
                NProgress.start();
                
                // 🔥 ARREGLO: Solo cambiamos el idioma del contexto. NO tocamos la URL.
                setLang(l);
                
                setTimeout(() => NProgress.done(), 200);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-sans transition-colors ${
                lang === l ? "text-foreground font-medium bg-muted/50" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {langLabels[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;