import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { ArrowRight, Clock, Timer, Scissors, Hand, Sparkles, Paintbrush, Droplets, Palette, Flower2, CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useServices, getLocalizedLabel, getLocalizedDescription } from "@/hooks/useServices";

const iconMap: Record<string, LucideIcon> = {
  scissors: Scissors, hand: Hand, sparkles: Sparkles, paintbrush: Paintbrush,
  droplets: Droplets, palette: Palette, "flower-2": Flower2, "circle-dot": CircleDot,
};

const formatPrice = (cents: number, from: boolean, fromLabel: string) => {
  const euros = (cents / 100).toFixed(0);
  return from ? `${fromLabel} ${euros}€` : `${euros}€`;
};

const Services = () => {
  const { lang, t } = useLanguage();
  const { data: dbServices = [], isLoading } = useServices();

  const categories = ["peluqueria", "masajes"] as const;

  return (
    <main className="pt-16">
      <section className="py-10 md:py-24">
        <div className="container max-w-3xl">
          <ScrollReveal>
            <h1 className="font-serif text-3xl md:text-5xl text-foreground text-center mb-3" style={{ lineHeight: "1.05" }}>
              {t("services.title")}
            </h1>
            <p className="text-center text-sm text-muted-foreground mb-12 md:mb-16 max-w-sm mx-auto">
              {t("services.subtitle")}
            </p>
          </ScrollReveal>

          {isLoading && (
            <p className="text-center text-sm text-muted-foreground py-8">Cargando…</p>
          )}

          {categories.map((cat, ci) => {
            const catServices = dbServices.filter((s) => s.category === cat);
            if (catServices.length === 0) return null;
            return (
              <div key={cat} className={ci > 0 ? "mt-12 md:mt-16" : ""}>
                <ScrollReveal>
                  <h2 className="text-[10px] font-sans uppercase tracking-widest-plus text-sand-dark mb-6 md:mb-8">
                    {t(`booking.categories.${cat}`)}
                  </h2>
                </ScrollReveal>
                <div className="space-y-3">
                  {catServices.map((svc, i) => {
                    const Icon = iconMap[svc.icon_name] || Scissors;
                    const isSandwich = !!(svc.phase1_min && svc.phase2_min && svc.phase3_min);
                    return (
                      <ScrollReveal key={svc.id} delay={i * 80}>
                        <div className="bg-card rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-sand-light/50 flex items-center justify-center shrink-0 mt-0.5">
                              <Icon size={18} className="text-sand-dark" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <h3 className="font-serif text-base md:text-lg text-foreground">
                                  {getLocalizedLabel(svc, lang)}
                                </h3>
                                <span className="text-sm font-medium text-sand-dark tabular-nums shrink-0">
                                  {svc.price_cents ? formatPrice(svc.price_cents, !!svc.price_from, t("services.from")) : ""}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {getLocalizedDescription(svc, lang)}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5">
                                  <Clock size={12} className="text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground tabular-nums">{svc.duration_min} min</span>
                                </div>
                                {isSandwich && (
                                  <div className="flex items-center gap-1.5">
                                    <Timer size={12} className="text-sand-dark" />
                                    <span className="text-[10px] text-sand-dark">{t("services.sandwich")}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </ScrollReveal>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <ScrollReveal delay={200}>
            <div className="mt-12 md:mt-16 text-center">
              <Button variant="hero" size="lg" className="h-16 px-10 text-lg w-full sm:w-auto" asChild>
                <Link to="/reservar">
                  {t("services.bookCta")}
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

export default Services;
