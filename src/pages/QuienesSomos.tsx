import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { ArrowRight, Heart, Gem, Leaf } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const QuienesSomos = () => {
  const { t } = useLanguage();

  const values = [
    { icon: Heart, title: t("about.value1Title"), desc: t("about.value1Desc") },
    { icon: Gem, title: t("about.value2Title"), desc: t("about.value2Desc") },
    { icon: Leaf, title: t("about.value3Title"), desc: t("about.value3Desc") },
  ];

  return (
    <main className="pt-16">
      {/* Hero */}
      <section className="py-14 md:py-24">
        <div className="container max-w-3xl text-center">
          <ScrollReveal>
            <h1 className="font-serif text-3xl md:text-5xl text-foreground mb-3" style={{ lineHeight: "1.05" }}>
              {t("about.title")}
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("about.subtitle")}</p>
          </ScrollReveal>
        </div>
      </section>

      {/* Story */}
      <section className="py-14 md:py-24 bg-warm-white">
        <div className="container max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12 items-center">
            <ScrollReveal>
              <div className="md:col-span-2">
                <div className="aspect-[3/4] rounded-lg bg-sand-light/40 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-serif text-6xl text-sand-dark/20">AG</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
            <div className="md:col-span-3">
              <ScrollReveal delay={100}>
                <span className="text-[10px] font-sans uppercase tracking-widest-plus text-sand-dark mb-4 block">
                  {t("about.storyTitle")}
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t("about.storyP1")}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t("about.storyP2")}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("about.storyP3")}</p>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-14 md:py-24">
        <div className="container max-w-3xl">
          <ScrollReveal>
            <h2 className="font-serif text-2xl md:text-4xl text-foreground text-center mb-10 md:mb-14" style={{ lineHeight: "1.1" }}>
              {t("about.valuesTitle")}
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {values.map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 120}>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <v.icon size={24} className="mx-auto text-sand-dark mb-4" />
                  <h3 className="font-serif text-base text-foreground mb-2">{v.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-14 md:py-24 bg-warm-white">
        <div className="container max-w-2xl text-center">
          <ScrollReveal>
            <h2 className="font-serif text-2xl md:text-4xl text-foreground mb-8" style={{ lineHeight: "1.1" }}>
              {t("about.teamTitle")}
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="inline-block">
              <div className="w-32 h-32 rounded-full bg-sand-light/40 mx-auto mb-4 flex items-center justify-center">
                <span className="font-serif text-3xl text-sand-dark/30">AG</span>
              </div>
              <h3 className="font-serif text-lg text-foreground">Ana González</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-widest-plus mt-1">{t("about.anaRole")}</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <div className="mt-10">
              <Button variant="hero" size="lg" className="h-16 px-10 text-lg w-full sm:w-auto" asChild>
                <Link to="/reservar">
                  {t("about.bookCta")}
                  <ArrowRight size={20} className="ml-2" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default QuienesSomos;
