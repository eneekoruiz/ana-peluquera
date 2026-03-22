import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { MapPin, Clock, Phone as PhoneIcon } from "lucide-react";

const Home = () => {
  return (
    <main className="pt-16">
      {/* Hero */}
      <section className="min-h-[90vh] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-sand-light/30" />
        <div className="container relative z-10 text-center py-24 md:py-32">
          <ScrollReveal>
            <div className="mb-8">
              <span className="font-serif text-7xl md:text-9xl tracking-wide text-foreground leading-none">AG</span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <h1 className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mb-6">
              Beauty Salon
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="w-12 h-px bg-sand-dark mx-auto mb-8" />
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <p className="text-base md:text-lg text-muted-foreground font-sans font-light max-w-md mx-auto leading-relaxed mb-4">
              Cuidado profesional del cabello en el corazón de Donostia
            </p>
            <p className="text-sm text-muted-foreground/70 font-sans">
              José María Salaberría 33, San Sebastián
            </p>
          </ScrollReveal>

          <ScrollReveal delay={550}>
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" className="h-14 px-8 text-base" asChild>
                <Link to="/reservar">Reservar Cita</Link>
              </Button>
              <Button variant="outline" size="lg" className="h-14 px-8 text-base" asChild>
                <Link to="/catalogo">Ver Catálogo</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 md:py-28 bg-warm-white">
        <div className="container">
          <ScrollReveal>
            <h2 className="text-center font-serif text-3xl md:text-4xl text-foreground mb-4" style={{ lineHeight: '1.1' }}>
              Nuestros Servicios
            </h2>
            <p className="text-center text-sm text-muted-foreground mb-16 max-w-sm mx-auto">
              Atención personalizada con productos profesionales
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { title: "Cabello", desc: "Corte, color, mechas y tratamientos capilares profesionales", icon: "✂️" },
              { title: "Barba", desc: "Recorte, perfilado y cuidado completo de barba", icon: "🧔" },
              { title: "Uñas", desc: "Manicura, esmalte gel y tratamientos fortalecedores", icon: "💅" },
            ].map((service, i) => (
              <ScrollReveal key={service.title} delay={i * 120}>
                <div className="group text-center p-8 bg-background rounded-lg hover:shadow-md transition-shadow duration-300">
                  <div className="text-4xl mb-6">{service.icon}</div>
                  <h3 className="font-serif text-xl text-foreground mb-3">{service.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{service.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="py-20 md:py-28">
        <div className="container max-w-2xl">
          <ScrollReveal>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground text-center mb-12" style={{ lineHeight: '1.1' }}>
              Encuéntranos
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: MapPin, label: "Dirección", value: "José María Salaberría 33\n20008 Donostia" },
              { icon: Clock, label: "Horario", value: "L-V: 9:00–19:00\nSáb: 9:00–14:00" },
              { icon: PhoneIcon, label: "Contacto", value: "943 000 000" },
            ].map((item, i) => (
              <ScrollReveal key={item.label} delay={i * 100}>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <item.icon size={20} className="mx-auto text-sand-dark mb-4" />
                  <h3 className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mb-3">
                    {item.label}
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{item.value}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-warm-white">
        <div className="container text-center">
          <ScrollReveal>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-6" style={{ lineHeight: '1.1' }}>
              ¿Lista para tu cita?
            </h2>
            <p className="text-sm text-muted-foreground mb-10 max-w-sm mx-auto">
              Reserva en 3 pasos — sin registro, sin complicaciones
            </p>
            <Button variant="hero" size="lg" className="h-14 px-10 text-base" asChild>
              <Link to="/reservar">Reservar Ahora</Link>
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default Home;
