import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";

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
            <div className="mt-12">
              <Button variant="hero" size="lg" asChild>
                <Link to="/catalogo">Explora Productos</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Services preview */}
      <section className="py-20 md:py-28 bg-warm-white">
        <div className="container">
          <ScrollReveal>
            <h2 className="text-center font-serif text-3xl md:text-4xl text-foreground mb-4" style={{ lineHeight: '1.1' }}>
              Nuestros Servicios
            </h2>
            <p className="text-center text-sm text-muted-foreground mb-16 max-w-sm mx-auto">
              Productos profesionales seleccionados para el cuidado experto
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { title: "Cabello", desc: "Champús, tratamientos y productos de styling profesional" },
              { title: "Barba", desc: "Aceites, bálsamos y herramientas de cuidado masculino" },
              { title: "Uñas", desc: "Esmaltes, tratamientos y accesorios de manicura" },
            ].map((service, i) => (
              <ScrollReveal key={service.title} delay={i * 120}>
                <div className="group text-center p-8 bg-background rounded-lg hover:shadow-md transition-shadow duration-300">
                  <div className="w-16 h-16 rounded-full bg-sand-light mx-auto mb-6 flex items-center justify-center">
                    <span className="font-serif text-xl text-foreground">{service.title[0]}</span>
                  </div>
                  <h3 className="font-serif text-xl text-foreground mb-3">{service.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{service.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="container text-center">
          <ScrollReveal>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-6" style={{ lineHeight: '1.1' }}>
              Reserva Tu Producto
            </h2>
            <p className="text-sm text-muted-foreground mb-10 max-w-sm mx-auto">
              Explora nuestro catálogo y reserva para recoger en el salón. Sin pagos online.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/catalogo">Ver Catálogo</Link>
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default Home;
