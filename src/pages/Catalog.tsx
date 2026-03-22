import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";

type Category = "Todos" | "Cabello" | "Barba" | "Uñas";

interface Product {
  id: string;
  name: string;
  category: "Cabello" | "Barba" | "Uñas";
  description: string;
}

const mockProducts: Product[] = [
  { id: "1", name: "Champú Reparador Intensivo", category: "Cabello", description: "Fórmula profesional con keratina para cabello dañado" },
  { id: "2", name: "Mascarilla Nutritiva", category: "Cabello", description: "Tratamiento profundo con aceite de argán" },
  { id: "3", name: "Spray Texturizante", category: "Cabello", description: "Volumen y textura natural sin residuos" },
  { id: "4", name: "Sérum Puntas Abiertas", category: "Cabello", description: "Reparación y brillo para puntas secas" },
  { id: "5", name: "Aceite de Barba Premium", category: "Barba", description: "Mezcla de jojoba y vitamina E para suavidad" },
  { id: "6", name: "Bálsamo Acondicionador", category: "Barba", description: "Hidratación y control para barba gruesa" },
  { id: "7", name: "Kit Recorte Profesional", category: "Barba", description: "Tijeras, peine y cepillo de calidad salón" },
  { id: "8", name: "Esmalte Gel Larga Duración", category: "Uñas", description: "Acabado brillante que dura hasta 2 semanas" },
  { id: "9", name: "Tratamiento Fortalecedor", category: "Uñas", description: "Base enriquecida con calcio y biotina" },
  { id: "10", name: "Aceite Cutículas", category: "Uñas", description: "Hidratación profunda con vitamina E" },
];

const categories: Category[] = ["Todos", "Cabello", "Barba", "Uñas"];

const Catalog = () => {
  const [active, setActive] = useState<Category>("Todos");
  const filtered = active === "Todos" ? mockProducts : mockProducts.filter((p) => p.category === active);

  return (
    <main className="pt-16">
      <section className="py-16 md:py-24">
        <div className="container">
          <ScrollReveal>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground text-center mb-4" style={{ lineHeight: '1.1' }}>
              Catálogo
            </h1>
            <p className="text-center text-sm text-muted-foreground mb-12 max-w-sm mx-auto">
              Productos profesionales seleccionados por Ana
            </p>
          </ScrollReveal>

          {/* Category filters */}
          <ScrollReveal delay={150}>
            <div className="flex justify-center gap-2 mb-12 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  className={`px-4 py-2 text-xs font-sans uppercase tracking-widest-plus rounded-md transition-all duration-200 active:scale-95 ${
                    active === cat
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:bg-sand-light"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </ScrollReveal>

          {/* Editorial asymmetric grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-8">
            {filtered.map((product, i) => (
              <ScrollReveal key={product.id} delay={i * 80}>
                <div
                  className={`group bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ${
                    i % 3 === 0 ? "sm:col-span-2 md:col-span-1" : ""
                  }`}
                >
                  {/* Image placeholder — editorial style */}
                  <div className={`bg-sand-light/40 flex items-center justify-center ${
                    i % 3 === 0 ? "aspect-[16/9] sm:aspect-[21/9]" : "aspect-[4/3]"
                  }`}>
                    <span className="font-serif text-5xl text-sand-dark/20">{product.category[0]}</span>
                  </div>
                  <div className="p-5">
                    <span className="text-[10px] font-sans uppercase tracking-widest-plus text-muted-foreground">
                      {product.category}
                    </span>
                    <h3 className="font-serif text-lg text-foreground mt-1 mb-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Catalog;
