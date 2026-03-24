import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { MapPin, Clock, Phone as PhoneIcon, Star, ArrowRight, Instagram } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";
import heroImage from "@/assets/hero-salon.jpg";

const instagramPosts = Array.from({ length: 6 }, (_, i) => ({
  id: `ig-${i}`,
  alt: `AG Beauty Salon work #${i + 1}`,
}));

const Home = () => {
  const { lang, t } = useLanguage();
  const testimonials = translations[lang].testimonials;

  return (
    <main className="pt-16">
      {/* Hero */}
      <section className="relative">
        <div className="aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] overflow-hidden">
          <img
            src={heroImage}
            alt="Interior del salón AG Beauty — ambiente cálido y minimalista"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
        <div className="container py-10 md:py-20 text-center">
          <ScrollReveal>
            <span className="font-serif text-5xl sm:text-6xl md:text-8xl tracking-wide text-foreground leading-none block mb-3" style={{ lineHeight: "0.9" }}>
              {t("home.heroTitle")}
            </span>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <h1 className="text-[10px] sm:text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mb-5">
              {t("home.heroSubtitle")}
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <div className="w-12 h-px bg-sand-dark mx-auto mb-5" />
          </ScrollReveal>
          <ScrollReveal delay={400}>
            <p className="text-base md:text-lg text-muted-foreground font-sans font-light max-w-md mx-auto leading-relaxed mb-1.5">
              {t("home.heroDescription")}
            </p>
            <p className="text-sm text-muted-foreground/70 font-sans">
              {t("home.heroLocation")}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={550}>
            <div className="mt-8 sm:mt-10 px-4 sm:px-0">
              <Button variant="hero" size="lg" className="h-16 px-10 text-lg w-full sm:w-auto" asChild>
                <Link to="/reservar">
                  {t("home.heroCta")}
                  <ArrowRight size={20} className="ml-2" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* About Ana */}
      <section className="py-14 md:py-24 bg-warm-white">
        <div className="container max-w-3xl">
          <ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12 items-center">
              <div className="md:col-span-2">
                <div className="aspect-[3/4] rounded-lg bg-sand-light/40 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-serif text-6xl text-sand-dark/20">AG</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-3">
                <span className="text-[10px] font-sans uppercase tracking-widest-plus text-sand-dark mb-4 block">{t("home.aboutTag")}</span>
                <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-4" style={{ lineHeight: "1.15" }}>
                  {t("home.aboutTitle")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t("home.aboutP1")}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("home.aboutP2")}</p>
                <div className="mt-6 flex gap-4">
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <Link to="/servicios">{t("home.viewServices")}</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <Link to="/revista">{t("home.magazine")}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-14 md:py-24">
        <div className="container max-w-3xl">
          <ScrollReveal>
            <h2 className="text-center font-serif text-2xl md:text-4xl text-foreground mb-3" style={{ lineHeight: "1.1" }}>
              {t("home.testimonialsTitle")}
            </h2>
            <p className="text-center text-sm text-muted-foreground mb-10 md:mb-14 max-w-sm mx-auto">
              {t("home.testimonialsSubtitle")}
            </p>
          </ScrollReveal>
          <div className="space-y-4 md:space-y-6">
            {testimonials.map((tst, i) => (
              <ScrollReveal key={tst.name} delay={i * 120}>
                <div className="bg-card rounded-lg p-6 md:p-8 shadow-sm">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={14} className="text-sand-dark fill-sand-dark" />
                    ))}
                  </div>
                  <p className="text-sm md:text-base text-foreground leading-relaxed italic mb-4">"{tst.text}"</p>
                  <p className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground">{tst.name}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram Feed */}
      <section className="py-14 md:py-24 bg-warm-white">
        <div className="container">
          <ScrollReveal>
            <div className="flex items-center justify-center gap-3 mb-8">
              <Instagram size={18} className="text-sand-dark" />
              <span className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground">@agbeautysalon</span>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
            {instagramPosts.map((post, i) => (
              <ScrollReveal key={post.id} delay={i * 60}>
                <div className="aspect-square bg-sand-light/30 rounded-md overflow-hidden group cursor-pointer">
                  <div className="w-full h-full flex items-center justify-center group-hover:bg-sand-light/50 transition-colors duration-300">
                    <Instagram size={16} className="text-sand-dark/20 group-hover:text-sand-dark/40 transition-colors" />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="py-14 md:py-24">
        <div className="container max-w-2xl">
          <ScrollReveal>
            <h2 className="font-serif text-2xl md:text-4xl text-foreground text-center mb-8 md:mb-10" style={{ lineHeight: "1.1" }}>
              {t("home.findUs")}
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: MapPin, label: t("home.address"), value: t("home.addressValue") },
              { icon: Clock, label: t("home.hours"), value: t("home.hoursValue") },
              { icon: PhoneIcon, label: t("home.contact"), value: "943 000 000" },
            ].map((item, i) => (
              <ScrollReveal key={item.label} delay={i * 100}>
                <div className="text-center p-5 bg-card rounded-lg shadow-sm">
                  <item.icon size={18} className="mx-auto text-sand-dark mb-3" />
                  <h3 className="text-[10px] font-sans uppercase tracking-widest-plus text-muted-foreground mb-2">{item.label}</h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{item.value}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 md:py-24 bg-warm-white">
        <div className="container text-center">
          <ScrollReveal>
            <h2 className="font-serif text-2xl md:text-4xl text-foreground mb-4" style={{ lineHeight: "1.1" }}>
              {t("home.readyCta")}
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">{t("home.readySubtitle")}</p>
            <Button variant="hero" size="lg" className="h-16 px-10 text-lg w-full sm:w-auto" asChild>
              <Link to="/reservar">
                {t("home.bookNow")}
                <ArrowRight size={20} className="ml-2" />
              </Link>
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default Home;
