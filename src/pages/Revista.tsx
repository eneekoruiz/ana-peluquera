/**
 * @fileoverview Revista.tsx — Galería de trabajos con CMS in-situ y fotos en Cloudinary.
 */

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import EditableText from "@/components/cms/EditableText";
import EditableImage from "@/components/cms/EditableImage";
import {
  useRevista,
  useUpdateMagazineItem,
  useDeleteMagazineItem,
  useAddMagazineItem,
  type MagazineItem,
} from "@/hooks/useRevista";
import { Eye, EyeOff, Trash2, Plus, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compressAndUpload } from "@/lib/storageManager";

// Usamos el mismo hook genérico de la DB para los textos de la página
import { useServicesPageContent, useUpdateServicesPageContent } from "@/hooks/useServices"; 

// ─── Sub-componente: Tarjeta de ítem de revista ──────────────────────────────

interface RevistaCellProps {
  item: MagazineItem;
  index: number;
  isEditingView: boolean;
  langLabel: string;
  lang: string;
  onUpdate: (id: string, updates: Partial<MagazineItem>) => void;
  onDelete: (id: string) => void;
}

const RevistaCell = ({ item, index, isEditingView, langLabel, lang, onUpdate, onDelete }: RevistaCellProps) => {
  const title = (lang === "en" ? item.title_en : lang === "eu" ? item.title_eu : item.title) || item.title;
  const description = (lang === "en" ? item.description_en : lang === "eu" ? item.description_eu : item.description) || item.description;
  const isHidden = !item.is_visible;

  const handleSaveTitle = async (newValue: string) => {
    const field = lang === "en" ? "title_en" : lang === "eu" ? "title_eu" : "title";
    await onUpdate(item.id, { [field]: newValue } as Partial<MagazineItem>);
  };

  const handleSaveImage = async (newUrl: string) => {
    await onUpdate(item.id, { image_url: newUrl });
  };

  return (
    <ScrollReveal key={item.id} delay={index * 70}>
      <div 
        className={cn(
          "group relative overflow-hidden rounded-lg cursor-pointer", 
          item.span ? "col-span-2" : "", 
          isHidden && isEditingView ? "opacity-50 ring-2 ring-dashed ring-amber-300" : ""
        )}
      >
        <EditableImage
          src={item.image_url} 
          alt={title || "Trabajo del salón"} 
          storagePath={`magazine`}
          onSave={handleSaveImage} 
          isEditing={isEditingView}
          className={cn("overflow-hidden bg-sand-light/40", item.span ? "aspect-[16/9]" : "aspect-[3/4]")}
          imgClassName="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
        />

        {!isEditingView && (
          <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/40 transition-colors duration-500 flex items-end p-3 sm:p-4 md:p-5">
            <div className="translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
              <h3 className="font-serif text-sm sm:text-base text-white mb-0.5">{title}</h3>
              {description && <p className="text-xs text-white/70">{description}</p>}
            </div>
          </div>
        )}

        {isEditingView && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex flex-col gap-1">
            <EditableText 
              value={title || ""} 
              onSave={handleSaveTitle} 
              isEditing 
              as="span" 
              className="font-serif text-sm text-white block" 
              placeholder="Título de la foto…" 
              langLabel={langLabel} 
            />
            
            <div className="flex items-center gap-1 mt-1">
              <button 
                type="button" 
                onClick={() => onUpdate(item.id, { is_visible: !item.is_visible })} 
                className="flex items-center gap-0.5 text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-full"
              >
                {isHidden ? <Eye size={9} /> : <EyeOff size={9} />} 
                {isHidden ? "Mostrar" : "Ocultar"}
              </button>
              
              <button 
                type="button" 
                onClick={() => { if (confirm(`¿Eliminar "${title}"?`)) onDelete(item.id); }} 
                className="flex items-center gap-0.5 text-[10px] bg-red-500/80 hover:bg-red-600 text-white px-2 py-1 rounded-full ml-auto"
              >
                <Trash2 size={9} /> Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </ScrollReveal>
  );
};

// ─── Formulario de nueva publicación ────────────────────────────────────────

const NewItemForm = ({ onAdd, onCancel }: { onAdd: (data: Omit<MagazineItem, "id" | "sort_order">) => void; onCancel: () => void; }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [span, setSpan] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setImageFile(file);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("El título es obligatorio"); return; }
    if (!imageFile) { toast.error("Selecciona una foto"); return; }

    setUploading(true);
    try {
      const url = await compressAndUpload(imageFile, `magazine`);
      
      // 🔥 AQUÍ ESTABA EL ERROR: Ya no enviamos "undefined", enviamos "" (texto vacío) que sí le gusta a Firebase.
      onAdd({ 
        title: title.trim(), 
        description: description.trim() || "", 
        image_url: url, 
        span, 
        is_visible: true 
      });

    } catch (error) {
      toast.error("No se pudo subir la foto");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="col-span-2 md:col-span-3 border-2 border-dashed border-amber-300 rounded-lg p-5 bg-amber-50/50">
      <p className="text-xs font-medium text-amber-800 mb-4 uppercase tracking-wider">Añadir a la Revista</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Lado izquierdo: Foto */}
        <div>
          {preview ? (
            <img src={preview} alt="preview" className="w-full aspect-[3/4] object-cover rounded-lg" />
          ) : (
            <label className="w-full aspect-[3/4] flex flex-col items-center justify-center border-2 border-dashed border-amber-200 rounded-lg cursor-pointer hover:bg-amber-50">
              <ImageIcon size={24} className="text-amber-400 mb-2" />
              <span className="text-xs text-amber-600">Seleccionar foto</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>
        
        {/* Lado derecho: Datos */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Título *</label>
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full h-9 px-3 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-amber-300" 
              placeholder="Balayage rubio miel…" 
            />
          </div>
          
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Descripción</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" 
              rows={3}
              placeholder="Técnica de mano alzada..." 
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
            <input type="checkbox" checked={span} onChange={(e) => setSpan(e.target.checked)} className="rounded" />
            <span>Foto panorámica (ocupa 2 columnas)</span>
          </label>
          
          <div className="flex gap-2 mt-auto pt-2">
            <button 
              type="button" 
              onClick={handleSubmit} 
              disabled={uploading} 
              className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg disabled:opacity-60"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : null} 
              {uploading ? "Subiendo…" : "Publicar"}
            </button>
            <button 
              type="button" 
              onClick={onCancel} 
              className="px-4 h-9 border rounded-lg text-sm text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────

const Revista = () => {
  const { t, lang } = useLanguage();
  const { isEditingView } = useAuth();
  
  const { data: allItems = [], isLoading } = useRevista(isEditingView);
  const updateItem = useUpdateMagazineItem();
  const deleteItem = useDeleteMagazineItem();
  const addItem = useAddMagazineItem();

  const { data: pageContent } = useServicesPageContent();
  const updatePageContent = useUpdateServicesPageContent();

  const [showAddForm, setShowAddForm] = useState(false);

  const visibleItems = isEditingView ? allItems : allItems.filter((i) => i.is_visible);
  const langLabel = lang === "es" ? "Español" : lang === "en" ? "English" : "Euskara";

  const displayTitle = pageContent?.[`magazine_title_${lang}`] || t("magazine.title");
  const displaySubtitle = pageContent?.[`magazine_subtitle_${lang}`] || t("magazine.subtitle");

  return (
    <main className="pt-16">
      <section className="py-10 md:py-24">
        <div className="container">
          
          <ScrollReveal>
             <div className="text-center mb-10 md:mb-14">
              <EditableText
                value={displayTitle}
                onSave={async (val) => await updatePageContent.mutateAsync({ [`magazine_title_${lang}`]: val })}
                isEditing={isEditingView} 
                as="h1" 
                className="font-serif text-3xl md:text-5xl text-foreground mb-3 inline-block" 
                style={{ lineHeight: "1.05" }} 
                langLabel={langLabel}
              />
              <br/>
              <EditableText
                value={displaySubtitle}
                onSave={async (val) => await updatePageContent.mutateAsync({ [`magazine_subtitle_${lang}`]: val })}
                isEditing={isEditingView} 
                as="p" 
                className="text-sm text-muted-foreground max-w-sm mx-auto inline-block" 
                langLabel={langLabel}
              />
            </div>
          </ScrollReveal>

          {isEditingView && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
              <span className="text-base">🖼️</span>
              <span><strong>Modo Edición:</strong> Haz clic en el título superior para cambiarlo. Sube fotos nuevas con el recuadro "+".</span>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="text-sand-dark animate-spin" />
            </div>
          )}

          {!isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              
              {visibleItems.map((item, i) => (
                <RevistaCell 
                  key={item.id} 
                  item={item} 
                  index={i} 
                  isEditingView={isEditingView} 
                  langLabel={langLabel} 
                  lang={lang} 
                  onUpdate={(id, u) => updateItem.mutate({ id, updates: u })} 
                  onDelete={(id) => deleteItem.mutate(id)} 
                />
              ))}

              {isEditingView && showAddForm && (
                <NewItemForm 
                  onAdd={(d) => addItem.mutate(d, { onSuccess: () => setShowAddForm(false) })} 
                  onCancel={() => setShowAddForm(false)} 
                />
              )}
              
              {isEditingView && !showAddForm && (
                <div className="col-span-1">
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(true)} 
                    className="w-full aspect-[3/4] flex flex-col items-center justify-center border-2 border-dashed border-amber-300 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                  >
                    <Plus size={24} className="mb-2" />
                    <span className="text-xs font-medium">Añadir a Revista</span>
                  </button>
                </div>
              )}

            </div>
          )}

          {!isLoading && visibleItems.length === 0 && !isEditingView && (
            <div className="flex flex-col items-center py-20 text-muted-foreground">
              <ImageIcon size={40} className="mb-4 opacity-20" />
              <p className="text-sm">Próximamente…</p>
            </div>
          )}

        </div>
      </section>
    </main>
  );
};

export default Revista;