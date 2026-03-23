import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import catalogCabello from "@/assets/catalog-cabello.jpg";
import catalogBarba from "@/assets/catalog-barba.jpg";
import catalogUnas from "@/assets/catalog-unas.jpg";

type Category = "Todos" | "Cabello" | "Barba" | "Uñas";

interface Product {
  id: string;
  name: string;
  category: "Cabello" | "Barba" | "Uñas";
  description: string;
}

const categoryImages: Record<string, string> = {
  Cabello: catalogCabello,
  Barba: catalogBarba,
  "Uñas": catalogUnas,
};

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
      <section className="py-10 md:py-24">
        <div className="container">
          <ScrollReveal>
            <h1 className="font-serif text-2xl md:text-4xl text-foreground text-center mb-3" style={{ lineHeight: '1.1' }}>
              Catálogo
            </h1>
            <p className="text-center text-sm text-muted-foreground mb-8 sm:mb-10 max-w-sm mx-auto">
              Productos profesionales seleccionados por Ana
            </p>
          </ScrollReveal>

          {/* Category filters */}
          <ScrollReveal delay={150}>
            <div className="flex justify-center gap-2 mb-8 sm:mb-10 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  className={`px-4 py-2.5 text-xs font-sans uppercase tracking-widest-plus rounded-md transition-all duration-200 active:scale-95 ${
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

          {/* Editorial grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {filtered.map((product, i) => (
              <ScrollReveal key={product.id} delay={i * 80}>
                <div
                  className={`group bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ${
                    i % 5 === 0 ? "sm:col-span-2" : ""
                  }`}
                >
                  <div className={`overflow-hidden ${i % 5 === 0 ? "aspect-[16/9] sm:aspect-[21/9]" : "aspect-[4/3]"}`}>
                    <img
                      src={categoryImages[product.category]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3.5 sm:p-4 md:p-5">
                    <span className="text-[10px] font-sans uppercase tracking-widest-plus text-muted-foreground">
                      {product.category}
                    </span>
                    <h3 className="font-serif text-[15px] sm:text-base md:text-lg text-foreground mt-1 mb-1">{product.name}</h3>
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
