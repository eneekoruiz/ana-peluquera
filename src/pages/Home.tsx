import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { MapPin, ArrowRight, Phone as PhoneIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import heroImage from "@/assets/hero-salon.jpg";

const Home = () => {
  const { t } = useLanguage();

  return (
    <main className="pt-16">
      {/* Hero — Brand + CTA focal point */}
      <section className="relative">
        <div className="aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] overflow-hidden">
          <img
            src={heroImage}
            alt="AG Beauty Salon — interior cálido y minimalista"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
        <div className="container py-12 md:py-24 text-center">
          <ScrollReveal>
            <span
              className="font-serif text-6xl sm:text-7xl md:text-9xl tracking-wide text-foreground leading-none block mb-2"
              style={{ lineHeight: "0.85" }}
            >
              AG
            </span>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h1 className="text-[10px] sm:text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mb-6">
              Beauty Salon
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <div className="w-12 h-px bg-sand-dark mx-auto mb-6" />
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <p className="text-base md:text-lg text-muted-foreground font-sans font-light max-w-md mx-auto leading-relaxed mb-2">
              {t("home.heroDescription")}
            </p>
            <p className="text-sm text-muted-foreground/70 font-sans mb-10">
              {t("home.heroLocation")}
            </p>
          </ScrollReveal>

          {/* PRIMARY ACTION — RESERVAR CITA */}
          <ScrollReveal delay={400}>
            <div className="px-4 sm:px-0">
              <Button variant="hero" size="lg" className="h-16 sm:h-20 px-10 sm:px-14 text-base sm:text-lg w-full sm:w-auto" asChild>
                <Link to="/reservar">
                  {t("home.heroCta")}
                  <ArrowRight size={20} className="ml-2" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>

          {/* Click-to-Call for seniors */}
          <ScrollReveal delay={500}>
            <div className="mt-4">
              <a
                href="tel:+34943000000"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-sans"
              >
                <PhoneIcon size={14} />
                {t("home.callNow")}
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Find Us — Map + Address + Google Maps button */}
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

          {/* Embedded Map */}
          <ScrollReveal delay={100}>
            <div className="aspect-[16/9] rounded-lg overflow-hidden shadow-sm mb-6">
              <iframe
                title="AG Beauty Salon — José María Salaberría 33, Donostia"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2905.0!2d-1.9785!3d43.3128!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zSm9zw6kgTWFyw61hIFNhbGFiZXJyw61hIDMzLCBEb25vc3RpYQ!5e0!3m2!1ses!2ses!4v1"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-card rounded-lg p-5 shadow-sm text-center">
                <MapPin size={18} className="mx-auto text-sand-dark mb-3" />
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {t("home.addressValue")}
                </p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=José+María+Salaberría+33+Donostia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-sans uppercase tracking-widest-plus text-sand-dark hover:text-foreground transition-colors"
                >
                  <MapPin size={12} />
                  {t("home.openMaps")}
                </a>
              </div>
              <div className="bg-card rounded-lg p-5 shadow-sm text-center">
                <PhoneIcon size={18} className="mx-auto text-sand-dark mb-3" />
                <p className="text-sm text-foreground mb-1">943 000 000</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line">{t("home.hoursValue")}</p>
                <a
                  href="tel:+34943000000"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-sans uppercase tracking-widest-plus text-sand-dark hover:text-foreground transition-colors"
                >
                  <PhoneIcon size={12} />
                  {t("home.callNow")}
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default Home;
