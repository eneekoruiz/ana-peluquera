import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Plus, Trash2, Image as ImageIcon, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import imageCompression from "browser-image-compression";

interface GalleryRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string | null;
  visible: boolean | null;
  sort_order: number | null;
  created_at: string | null;
}

const AdminGallery = () => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["gallery_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gallery").select("*").order("sort_order");
      if (error) throw error;
      return data as GalleryRow[];
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const compressed = await imageCompression(f, {
        maxSizeMB: 0.9,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      setFile(compressed as File);
      toast.info(`Imagen comprimida: ${(compressed.size / 1024).toFixed(0)}KB`);
    } catch {
      toast.error("Error al comprimir imagen");
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !file) {
      toast.error("Añade título y foto");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(path);

      const { error: insErr } = await supabase.from("gallery").insert({
        title: title.trim(),
        description: description.trim(),
        image_url: urlData.publicUrl,
      });
      if (insErr) throw insErr;

      qc.invalidateQueries({ queryKey: ["gallery_admin"] });
      toast.success("Foto añadida al catálogo");
      setShowForm(false);
      setTitle("");
      setDescription("");
      setFile(null);
    } catch (err: any) {
      toast.error(err?.message || "Error al subir foto");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: GalleryRow) => {
    // Extract path from URL
    const urlParts = item.image_url.split("/gallery/");
    const storagePath = urlParts[urlParts.length - 1];
    if (storagePath) {
      await supabase.storage.from("gallery").remove([storagePath]);
    }
    await supabase.from("gallery").delete().eq("id", item.id);
    qc.invalidateQueries({ queryKey: ["gallery_admin"] });
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-sand-dark transition-colors"
            >
              <ImageIcon size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                {file ? file.name : "Toca para seleccionar foto"}
              </p>
              <p className="text-xs text-muted-foreground/60">Se comprimirá automáticamente a &lt;1MB</p>
            </button>
            <div>
              <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-1.5">Título</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Corte bob texturizado"
                className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
            </div>
            <div>
              <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-1.5">Descripción (opcional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción breve…" rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow resize-none" />
            </div>
            <Button variant="hero" size="sm" className="gap-1" onClick={handleUpload} disabled={uploading}>
              <Plus size={12} /> {uploading ? "Subiendo…" : "Publicar"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {isLoading && <p className="col-span-full text-center text-sm text-muted-foreground py-8">Cargando…</p>}
        {items.map((item) => (
          <div key={item.id} className="group relative bg-card rounded-lg overflow-hidden shadow-sm">
            <div className="aspect-square bg-sand-light/40">
              {item.image_url ? (
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={24} className="text-sand-dark/30" />
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="text-xs font-medium text-foreground truncate">{item.title}</h3>
              {item.description && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.description}</p>}
            </div>
            <button
              onClick={() => handleDelete(item)}
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
