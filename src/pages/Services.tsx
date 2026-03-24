import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { ArrowRight, Clock, Timer } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { services, categoryLabels, type ServiceCategory } from "@/lib/services-data";

const categories: ServiceCategory[] = ["peluqueria", "masajes"];

const formatPrice = (cents: number, from: boolean, fromLabel: string) => {
  const euros = (cents / 100).toFixed(0);
  return from ? `${fromLabel} ${euros}€` : `${euros}€`;
};

const Services = () => {
  const { t } = useLanguage();

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

          {categories.map((cat, ci) => (
            <div key={cat} className={ci > 0 ? "mt-12 md:mt-16" : ""}>
              <ScrollReveal>
                <h2 className="text-[10px] font-sans uppercase tracking-widest-plus text-sand-dark mb-6 md:mb-8">
                  {t(`booking.categories.${cat}`)}
                </h2>
              </ScrollReveal>
              <div className="space-y-3">
                {services
                  .filter((s) => s.category === cat)
                  .map((service, i) => {
                    const Icon = service.icon;
                    const isSandwich = !!(service.phase1Min && service.phase2Min && service.phase3Min);
                    return (
                      <ScrollReveal key={service.id} delay={i * 80}>
                        <div className="bg-card rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-sand-light/50 flex items-center justify-center shrink-0 mt-0.5">
                              <Icon size={18} className="text-sand-dark" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <h3 className="font-serif text-base md:text-lg text-foreground">{service.label}</h3>
                                <span className="text-sm font-medium text-sand-dark tabular-nums shrink-0">
                                  {service.priceCents ? formatPrice(service.priceCents, service.priceFrom, t("services.from")) : ""}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5">
                                  <Clock size={12} className="text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground tabular-nums">{service.duration}</span>
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
          ))}

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
