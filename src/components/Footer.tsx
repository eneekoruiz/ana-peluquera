import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import EditableText from "@/components/cms/EditableText";
import { useServicesPageContent, useUpdateServicesPageContent } from "@/hooks/useServices";

const Footer = () => {
  const { t, lang } = useLanguage();
  const { isEditingView } = useAuth();
  
  const { data: pageContent } = useServicesPageContent();
  const updatePageContent = useUpdateServicesPageContent();

  const langLabel = lang === "es" ? "Español" : lang === "en" ? "English" : "Euskara";

  // Textos editables (con fallback al idioma activo o traducciones)
  const displayBrand = pageContent?.[`footer_brand_${lang}`] || t("footer.brand");
  
  // Consumimos los mismos datos de contacto que la Home
  const displayAddress = pageContent?.contact_address || "José María Salaberría 33\n20008 Donostia";
  const displayPhone = pageContent?.contact_phone || "843 67 35 95";
  const displayHours = pageContent?.[`contact_hours_${lang}`] || `${t("footer.weekdays")}\n${t("footer.saturday")}\n${t("footer.sunday")}`;

  return (
    <footer className="border-t border-border bg-warm-white">
      <div className="container py-10 md:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <span className="font-serif text-2xl tracking-wide text-foreground">AG</span>
            <div className="mt-3">
               <EditableText
                  value={displayBrand}
                  onSave={async (val) => await updatePageContent.mutateAsync({ [`footer_brand_${lang}`]: val })}
                  isEditing={isEditingView}
                  as="p"
                  className="text-sm text-muted-foreground leading-relaxed max-w-xs"
                  langLabel={langLabel}
                />
            </div>
          </div>
          <div>
            <h4 className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mb-4">{t("footer.contact")}</h4>
            <address className="not-italic text-sm text-foreground leading-relaxed space-y-2">
              <EditableText
                value={displayAddress}
                onSave={async (val) => await updatePageContent.mutateAsync({ contact_address: val })}
                isEditing={isEditingView}
                as="p"
                className="whitespace-pre-line"
              />
              
              <div className="pt-1">
                {isEditingView ? (
                  <EditableText
                    value={displayPhone}
                    onSave={async (val) => await updatePageContent.mutateAsync({ contact_phone: val })}
                    isEditing={isEditingView}
                    as="p"
                  />
                ) : (
                  <a href={`tel:+34${displayPhone.replace(/\s+/g, '')}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    Tel: {displayPhone}
                  </a>
                )}
              </div>
            </address>
          </div>
          <div>
            <h4 className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mb-4">{t("footer.schedule")}</h4>
            <div className="text-sm text-foreground leading-relaxed">
              <EditableText
                value={displayHours}
                onSave={async (val) => await updatePageContent.mutateAsync({ [`contact_hours_${lang}`]: val })}
                isEditing={isEditingView}
                as="p"
                className="whitespace-pre-line"
                langLabel={langLabel}
              />
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