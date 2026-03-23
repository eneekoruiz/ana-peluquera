import ScrollReveal from "@/components/ScrollReveal";
import { Image as ImageIcon } from "lucide-react";
import catalogCabello from "@/assets/catalog-cabello.jpg";
import catalogBarba from "@/assets/catalog-barba.jpg";
import catalogUnas from "@/assets/catalog-unas.jpg";

interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  image: string;
  span?: boolean;
}

const galleryItems: GalleryItem[] = [
  { id: "1", title: "Balayage Rubio Miel", description: "Técnica de mano alzada sobre base castaña", image: catalogCabello, span: true },
  { id: "2", title: "Corte Texturizado", description: "Bob asimétrico con movimiento", image: catalogBarba },
  { id: "3", title: "Manicura Francesa", image: catalogUnas },
  { id: "4", title: "Coloración Fantasía", description: "Tonos pastel con raíz difuminada", image: catalogCabello },
  { id: "5", title: "Recogido de Novia", description: "Peinado elegante para eventos especiales", image: catalogBarba, span: true },
  { id: "6", title: "Tratamiento Keratina", image: catalogUnas },
  { id: "7", title: "Mechas Babylights", description: "Efecto natural y luminoso", image: catalogCabello },
  { id: "8", title: "Cuidado de Barba", image: catalogBarba },
];

const Revista = () => {
  return (
    <main className="pt-16">
      <section className="py-10 md:py-24">
        <div className="container">
          <ScrollReveal>
            <h1 className="font-serif text-3xl md:text-5xl text-foreground text-center mb-3" style={{ lineHeight: '1.05' }}>
              Revista
            </h1>
            <p className="text-center text-sm text-muted-foreground mb-10 md:mb-14 max-w-sm mx-auto">
              Una selección de nuestros trabajos favoritos
            </p>
          </ScrollReveal>

          {/* Asymmetric editorial grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {galleryItems.map((item, i) => (
              <ScrollReveal
                key={item.id}
                delay={i * 70}
              >
                <div
                  className={`group relative overflow-hidden rounded-lg cursor-pointer ${
                    item.span ? "col-span-2" : ""
                  }`}
                >
                  <div className={`overflow-hidden ${item.span ? "aspect-[16/9]" : "aspect-[3/4]"}`}>
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                      loading="lazy"
                    />
                  </div>
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/40 transition-colors duration-500 flex items-end p-3 sm:p-4 md:p-5">
                    <div className="translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                      <h3 className="font-serif text-sm sm:text-base text-white mb-0.5">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-white/70">{item.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Placeholder for more */}
          <ScrollReveal delay={300}>
            <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="aspect-square bg-sand-light/30 rounded-lg flex items-center justify-center">
                  <ImageIcon size={20} className="text-sand-dark/20" />
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default Revista;
