import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Plus, Trash2, Image as ImageIcon, X } from "lucide-react";

interface GalleryItem {
  id: string;
  title: string;
  description: string;
  uploadedAt: string;
}

const mockGallery: GalleryItem[] = [
  { id: "G1", title: "Corte bob texturizado", description: "Antes y después — transformación de verano", uploadedAt: "2026-03-20" },
  { id: "G2", title: "Mechas balayage", description: "Tono rubio miel sobre base castaña", uploadedAt: "2026-03-18" },
  { id: "G3", title: "Manicura gel francesa", description: "", uploadedAt: "2026-03-15" },
  { id: "G4", title: "Coloración fantasía", description: "Azul denim con raíz oscura", uploadedAt: "2026-03-10" },
];

const AdminGallery = () => {
  const [items, setItems] = useState(mockGallery);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleUpload = () => {
    if (!title.trim()) {
      toast.error("Añade un título");
      return;
    }
    // Would use browser-image-compression + Firebase Storage
    const newItem: GalleryItem = {
      id: `G${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    setItems((prev) => [newItem, ...prev]);
    toast.success("Foto añadida al catálogo");
    setShowForm(false);
    setTitle("");
    setDescription("");
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.info("Foto eliminada");
  };

  return (
    <ScrollReveal>
      <div className="bg-card rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-lg text-foreground">Galería del Catálogo</h2>
          <Button variant="sand" size="sm" className="gap-1" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Subir Foto"}
          </Button>
        </div>

        {showForm && (
          <div className="p-4 border-b border-border bg-muted/20 space-y-3">
            {/* Upload area */}
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-sand-dark transition-colors">
              <ImageIcon size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Toca para seleccionar foto</p>
              <p className="text-xs text-muted-foreground/60">Se comprimirá automáticamente a &lt;1MB</p>
            </div>
            <div>
              <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-1.5">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Corte bob texturizado"
                className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-1.5">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción breve del trabajo..."
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow resize-none"
              />
            </div>
            <Button variant="hero" size="sm" className="gap-1" onClick={handleUpload}>
              <Plus size={12} />
              Publicar
            </Button>
          </div>
        )}
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.id} className="group relative bg-card rounded-lg overflow-hidden shadow-sm">
            <div className="aspect-square bg-sand-light/40 flex items-center justify-center">
              <ImageIcon size={24} className="text-sand-dark/30" />
            </div>
            <div className="p-3">
              <h3 className="text-xs font-medium text-foreground truncate">{item.title}</h3>
              {item.description && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.description}</p>
              )}
              <p className="text-[10px] text-muted-foreground/60 tabular-nums mt-1">{item.uploadedAt}</p>
            </div>
            {/* Delete overlay */}
            <button
              onClick={() => handleDelete(item.id)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive hover:text-white active:scale-95"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </ScrollReveal>
  );
};

export default AdminGallery;
