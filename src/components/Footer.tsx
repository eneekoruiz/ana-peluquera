import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-warm-white">
      <div className="container py-10 md:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <span className="font-serif text-2xl tracking-wide text-foreground">AG</span>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t("footer.brand")}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mb-4">{t("footer.contact")}</h4>
            <address className="not-italic text-sm text-foreground leading-relaxed space-y-1">
              <p>José María Salaberría 33</p>
              <p>20008 Donostia — San Sebastián</p>
              <p className="mt-2">
                <a href="tel:+34943000000" className="text-muted-foreground hover:text-foreground transition-colors">
                  Tel: 943 000 000
                </a>
              </p>
            </address>
          </div>
          <div>
            <h4 className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mb-4">{t("footer.schedule")}</h4>
            <div className="text-sm text-foreground leading-relaxed space-y-1">
              <p>{t("footer.weekdays")}</p>
              <p>{t("footer.saturday")}</p>
              <p className="text-muted-foreground">{t("footer.sunday")}</p>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground tracking-wide">
            © {new Date().getFullYear()} AG Beauty Salon. {t("footer.rights")}
          </p>
          <Link to="/privacidad" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t("footer.privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
