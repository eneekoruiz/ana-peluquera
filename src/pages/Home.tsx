import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { MapPin, ArrowRight, Phone as PhoneIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import EditableText from "@/components/cms/EditableText";
import EditableImage from "@/components/cms/EditableImage";

// 🔥 Usamos los hooks de Servicios para guardar los textos de portada y reusamos la lógica
import { useServicesPageContent, useUpdateServicesPageContent } from "@/hooks/useServices";
import heroImageFallback from "@/assets/hero-salon.jpg";

const Home = () => {
  const { t, lang } = useLanguage();
  const { isEditingView } = useAuth();
  
  const { data: pageContent } = useServicesPageContent();
  const updatePageContent = useUpdateServicesPageContent();

  const langLabel = lang === "es" ? "Español" : lang === "en" ? "English" : "Euskara";

  // Textos editables (con fallback al idioma activo o traducciones)
  const displayTitle = pageContent?.[`home_title_${lang}`] || "AG";
  const displaySubtitle = pageContent?.[`home_subtitle_${lang}`] || "Beauty Salon";
  const displayDesc = pageContent?.[`home_desc_${lang}`] || t("home.heroDescription");

  // Contacto y horarios (Globales, sin sufijo de idioma)
  const displayAddress = pageContent?.contact_address || "José María Salaberría 33\n20008 Donostia";
  const displayPhone = pageContent?.contact_phone || "943 000 000";
  const displayMapUrl = pageContent?.contact_map_url || "https://www.google.com/maps/search/?api=1&query=José+María+Salaberría+33+Donostia";
  const displayHours = pageContent?.[`contact_hours_${lang}`] || t("home.hoursValue");

  return (
    <main className="pt-16">
      
      {/* Banner de aviso del Modo Edición */}
      {isEditingView && (
        <div className="container mt-6 mb-0">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
            <span className="text-base">✨</span>
            <span>
              <strong>Modo Edición activo.</strong> Haz clic en los textos o en la foto del salón para editarlos.
              Idioma activo: <strong>{langLabel}</strong>.
            </span>
          </div>
        </div>
      )}

      {/* 1. Brand + CTA — First thing you see, no distractions */}
      <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="container text-center px-6">
          <ScrollReveal>
            <div className="inline-block">
              <EditableText
                value={displayTitle}
                onSave={async (val) => await updatePageContent.mutateAsync({ [`home_title_${lang}`]: val })}
                isEditing={isEditingView}
                as="span"
                className="font-serif text-7xl sm:text-8xl md:text-9xl tracking-wide text-foreground leading-none block"
                style={{ lineHeight: "0.85" }}
                langLabel={langLabel}
              />
            </div>
          </ScrollReveal>
          
          <ScrollReveal delay={100}>
            <div className="mt-3 mb-8 inline-block">
              <EditableText
                value={displaySubtitle}
                onSave={async (val) => await updatePageContent.mutateAsync({ [`home_subtitle_${lang}`]: val })}
                isEditing={isEditingView}
                as="h1"
                className="text-xs sm:text-sm font-sans uppercase tracking-widest-plus text-muted-foreground"
                langLabel={langLabel}
              />
            </div>
          </ScrollReveal>
          
          <ScrollReveal delay={200}>
            <div className="w-12 h-px bg-sand-dark mx-auto mb-8" />
          </ScrollReveal>
          
          <ScrollReveal delay={300}>
            <div className="max-w-md mx-auto mb-10">
              <EditableText
                value={displayDesc}
                onSave={async (val) => await updatePageContent.mutateAsync({ [`home_desc_${lang}`]: val })}
                isEditing={isEditingView}
                as="p"
                className="text-base md:text-lg text-muted-foreground font-sans font-light leading-relaxed"
                langLabel={langLabel}
              />
            </div>
          </ScrollReveal>

          {/* PRIMARY ACTION */}
          {!isEditingView && (
            <ScrollReveal delay={400}>
              <Button variant="hero" size="lg" className="h-16 sm:h-20 px-10 sm:px-14 text-base sm:text-lg w-full sm:w-auto" asChild>
                <Link to="/reservar">
                  {t("home.heroCta")}
                  <ArrowRight size={20} className="ml-2" />
                </Link>
              </Button>
            </ScrollReveal>
          )}

          {/* Click-to-Call */}
          {!isEditingView && (
            <ScrollReveal delay={500}>
              <div className="mt-5">
                <a
                  href={`tel:+34${displayPhone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-sans"
                >
                  <PhoneIcon size={14} />
                  {t("home.callNow")}
                </a>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* 2. Visual Context — One salon photo (Editable) */}
      <section>
        <ScrollReveal>
          <div className="aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-sand-light/20 relative group">
            <EditableImage
              src={pageContent?.home_hero_image || heroImageFallback}
              alt="AG Beauty Salon — interior"
              storagePath="home"
              onSave={async (url) => await updatePageContent.mutateAsync({ home_hero_image: url })}
              isEditing={isEditingView}
              className="w-full h-full"
              imgClassName="w-full h-full object-cover"
            />
          </div>
        </ScrollReveal>
      </section>

      {/* 3. Find Us — Map + Address + Google Maps */}
      <section className="py-14 md:py-24 bg-warm-white">
        <div className="container max-w-3xl">
          <ScrollReveal>
            <h2
              className="font-serif text-2xl md:text-4xl text-foreground text-center mb-8 md:mb-10"
              style={{ lineHeight: "1.1" }}
            >
              {t("home.findUs")}
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="aspect-[16/9] rounded-lg overflow-hidden shadow-sm mb-6 relative">
              <iframe
                title="AG Beauty Salon Map"
                src={displayMapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full pointer-events-none" // Desactivamos clics para que el iframe no moleste al editable
              />
              
              {/* Overlay editable para cambiar la URL del mapa */}
              {isEditingView && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-card p-4 rounded-lg text-center shadow-lg max-w-sm w-full">
                    <p className="text-xs font-bold mb-2">URL del mapa (Iframe src):</p>
                    <EditableText
                      value={displayMapUrl}
                      onSave={async (val) => await updatePageContent.mutateAsync({ contact_map_url: val })}
                      isEditing={isEditingView}
                      as="p"
                      className="text-xs text-muted-foreground break-all"
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-card rounded-lg p-5 shadow-sm text-center flex flex-col items-center">
                <MapPin size={18} className="text-sand-dark mb-3" />
                
                <EditableText
                  value={displayAddress}
                  onSave={async (val) => await updatePageContent.mutateAsync({ contact_address: val })}
                  isEditing={isEditingView}
                  as="p"
                  className="text-sm text-foreground leading-relaxed whitespace-pre-line text-center w-full"
                />

                {!isEditingView && (
                  <a
                    href={displayMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-sans uppercase tracking-widest-plus text-sand-dark hover:text-foreground transition-colors"
                  >
                    <MapPin size={12} />
                    {t("home.openMaps")}
                  </a>
                )}
              </div>
              <div className="bg-card rounded-lg p-5 shadow-sm text-center flex flex-col items-center">
                <PhoneIcon size={18} className="text-sand-dark mb-3" />
                
                <div className="mb-1 w-full text-center">
                   <EditableText
                    value={displayPhone}
                    onSave={async (val) => await updatePageContent.mutateAsync({ contact_phone: val })}
                    isEditing={isEditingView}
                    as="p"
                    className="text-sm text-foreground text-center"
                  />
                </div>

                <div className="w-full text-center">
                  <EditableText
                    value={displayHours}
                    onSave={async (val) => await updatePageContent.mutateAsync({ [`contact_hours_${lang}`]: val })}
                    isEditing={isEditingView}
                    as="p"
                    className="text-xs text-muted-foreground whitespace-pre-line text-center"
                    langLabel={langLabel}
                  />
                </div>

                {!isEditingView && (
                  <a
                    href={`tel:+34${displayPhone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-sans uppercase tracking-widest-plus text-sand-dark hover:text-foreground transition-colors"
                  >
                    <PhoneIcon size={12} />
                    {t("home.callNow")}
                  </a>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default Home;