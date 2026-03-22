import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";

type Category = "Todos" | "Cabello" | "Barba" | "Uñas";

interface Product {
  id: string;
  name: string;
  category: "Cabello" | "Barba" | "Uñas";
  price: number;
  description: string;
  stock: number;
}

const mockProducts: Product[] = [
  { id: "1", name: "Champú Reparador Intensivo", category: "Cabello", price: 18.50, description: "Fórmula profesional con keratina para cabello dañado", stock: 12 },
  { id: "2", name: "Mascarilla Nutritiva", category: "Cabello", price: 24.00, description: "Tratamiento profundo con aceite de argán", stock: 8 },
  { id: "3", name: "Spray Texturizante", category: "Cabello", price: 15.90, description: "Volumen y textura natural sin residuos", stock: 15 },
  { id: "4", name: "Sérum Puntas Abiertas", category: "Cabello", price: 19.50, description: "Reparación y brillo para puntas secas", stock: 6 },
  { id: "5", name: "Aceite de Barba Premium", category: "Barba", price: 22.00, description: "Mezcla de jojoba y vitamina E para suavidad", stock: 10 },
  { id: "6", name: "Bálsamo Acondicionador", category: "Barba", price: 16.50, description: "Hidratación y control para barba gruesa", stock: 7 },
  { id: "7", name: "Kit Recorte Profesional", category: "Barba", price: 35.00, description: "Tijeras, peine y cepillo de calidad salón", stock: 4 },
  { id: "8", name: "Esmalte Gel Larga Duración", category: "Uñas", price: 12.00, description: "Acabado brillante que dura hasta 2 semanas", stock: 20 },
  { id: "9", name: "Tratamiento Fortalecedor", category: "Uñas", price: 14.50, description: "Base enriquecida con calcio y biotina", stock: 11 },
  { id: "10", name: "Aceite Cutículas", category: "Uñas", price: 9.90, description: "Hidratación profunda con vitamina E", stock: 18 },
];

const categories: Category[] = ["Todos", "Cabello", "Barba", "Uñas"];

const Catalog = () => {
  const [active, setActive] = useState<Category>("Todos");

  const filtered = active === "Todos" ? mockProducts : mockProducts.filter((p) => p.category === active);

  const handleReserve = (product: Product) => {
    toast.success(`"${product.name}" reservado`, {
      description: "Recógelo en el salón cuando esté listo.",
    });
  };

  return (
    <main className="pt-16">
      <section className="py-16 md:py-24">
        <div className="container">
          <ScrollReveal>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground text-center mb-4" style={{ lineHeight: '1.1' }}>
              Catálogo de Productos
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
                      ? "bg-charcoal text-cream"
                      : "bg-secondary text-muted-foreground hover:bg-sand-light"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </ScrollReveal>

          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product, i) => (
              <ScrollReveal key={product.id} delay={i * 80}>
                <div className="group bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                  {/* Image placeholder */}
                  <div className="aspect-[4/3] bg-sand-light/50 flex items-center justify-center">
                    <span className="font-serif text-4xl text-sand-dark/40">{product.category[0]}</span>
                  </div>

                  <div className="p-5">
                    <span className="text-[10px] font-sans uppercase tracking-widest-plus text-muted-foreground">
                      {product.category}
                    </span>
                    <h3 className="font-serif text-lg text-foreground mt-1 mb-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{product.description}</p>

                    <div className="flex items-center justify-between">
                      <span className="font-sans text-lg font-medium text-foreground tabular-nums">
                        {product.price.toFixed(2)} €
                      </span>
                      <Button
                        variant="sand"
                        size="sm"
                        onClick={() => handleReserve(product)}
                        disabled={product.stock === 0}
                      >
                        {product.stock > 0 ? "Reservar" : "Agotado"}
                      </Button>
                    </div>

                    {product.stock <= 5 && product.stock > 0 && (
                      <p className="text-xs text-sand-dark mt-2">Últimas {product.stock} unidades</p>
                    )}
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
