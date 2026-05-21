import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { ArrowRight, Instagram, Plus, Trash2, Loader2, Edit3 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import EditableText from "@/components/cms/EditableText";
import EditableImage from "@/components/cms/EditableImage";
import {
  useAboutContent,
  useUpdateAboutContent,
  type AboutContent,
  type InstagramPost,
} from "@/hooks/useAboutContent";
import { compressAndUpload } from "@/lib/storageManager";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Sub-componente: Feed estilo Instagram ───────────────────────────────────

interface InstagramFeedProps {
  posts: InstagramPost[];
  handle: string;
  isEditingView: boolean;
  onAddPost: (post: Omit<InstagramPost, "id">) => void;
  onDeletePost: (postId: string) => void;
  onUpdateHandle: (newHandle: string) => void;
}

const InstagramFeed = ({
  posts,
  handle,
  isEditingView,
  onAddPost,
  onDeletePost,
  onUpdateHandle
}: InstagramFeedProps) => {
  const [uploading, setUploading] = useState(false);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [handleVal, setHandleVal] = useState(handle);

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await compressAndUpload(file, `instagram_feed`);
      onAddPost({ image_url: url, caption: "" });
    } catch {
      toast.error("No se pudo subir la foto");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const saveHandle = () => {
    if (handleVal.trim() !== "") onUpdateHandle(handleVal);
    setIsEditingHandle(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center shadow-sm">
          <Instagram size={20} className="text-white" />
        </div>
        <div>
          {isEditingView && isEditingHandle ? (
             <input 
               autoFocus type="text" value={handleVal}
               onChange={(e) => setHandleVal(e.target.value)}
               onBlur={saveHandle}
               onKeyDown={(e) => e.key === 'Enter' && saveHandle()}
               className="text-sm font-medium text-foreground border-b border-sand-dark focus:outline-none bg-transparent"
             />
          ) : (
            <p 
              className={cn("text-sm font-medium text-foreground flex items-center gap-1.5", isEditingView && "cursor-pointer hover:text-sand-dark")}
              onClick={() => isEditingView && setIsEditingHandle(true)}
              title={isEditingView ? "Editar usuario" : ""}
            >
              @{handle || "anagonzalez_beauty"} {isEditingView && <Edit3 size={12} className="text-muted-foreground inline"/>}
            </p>
          )}
          <p className="text-xs text-muted-foreground font-light">Instagram Portfolio</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {posts.map((post) => (
          <div key={post.id} className="relative group aspect-square rounded-xl overflow-hidden bg-sand-light/10 border border-sand-dark/5 shadow-sm">
            <img src={post.image_url} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors duration-300 flex items-end p-3">
              {post.caption && <p className="text-[10px] md:text-xs text-white/95 leading-tight opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2 font-light">{post.caption}</p>}
            </div>
            {isEditingView && (
              <button type="button" onClick={() => onDeletePost(post.id)} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {isEditingView && (
          <label className={cn("aspect-square rounded-xl border-2 border-dashed border-sand-dark/20 flex flex-col items-center justify-center cursor-pointer hover:bg-sand-light/10 hover:border-sand-dark/40 transition-colors", uploading && "opacity-60 pointer-events-none")}>
            {uploading ? <Loader2 size={24} className="text-sand-dark animate-spin" /> : <><Plus size={24} className="text-sand-dark/55 mb-1.5" /><span className="text-[10px] text-sand-dark font-medium uppercase tracking-wider">Añadir foto</span></>}
            <input type="file" accept="image/*" onChange={handleAddPhoto} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────

const QuienesSomos = () => {
  const { t, lang } = useLanguage();
  const { isEditingView } = useAuth();
  const { data: about, isLoading } = useAboutContent();
  const update = useUpdateAboutContent();

  const langLabel = lang === "es" ? "Español" : lang === "en" ? "English" : "Euskara";
  const ls = lang as "es" | "en" | "eu";

  const makeSave = (baseField: string) => async (newValue: string) => {
    const fieldKey = `${baseField}_${ls}` as keyof AboutContent;
    await update.mutateAsync({ [fieldKey]: newValue } as Partial<AboutContent>);
  };

  const makeSaveDirect = (field: string) => async (newValue: string) => {
    await update.mutateAsync({ [field]: newValue } as Partial<AboutContent>);
  };

  const getText = (baseField: string, defaultI18nKey?: string): string => {
    const fieldKey = `${baseField}_${ls}` as keyof AboutContent;
    const fallback = `${baseField}_es` as keyof AboutContent;
    if (about && (about[fieldKey] || about[fallback])) {
      return (about[fieldKey] as string) || (about[fallback] as string);
    }
    return defaultI18nKey ? t(defaultI18nKey) : "";
  };

  const values = [1, 2, 3].map((n) => ({
    title: getText(`value${n}_title`, `about.value${n}Title`),
    desc: getText(`value${n}_desc`, `about.value${n}Desc`),
    titleField: `value${n}_title`,
    descField: `value${n}_desc`,
  }));

  const handleAddPost = async (post: Omit<InstagramPost, "id">) => {
    const currentPosts = about?.feed_posts || [];
    const newPost: InstagramPost = { ...post, id: `post-${Date.now()}` };
    await update.mutateAsync({ feed_posts: [...currentPosts, newPost] });
    toast.success("Foto añadida al feed");
  };

  const handleDeletePost = async (postId: string) => {
    const updated = (about?.feed_posts || []).filter((p) => p.id !== postId);
    await update.mutateAsync({ feed_posts: updated });
    toast.success("Post eliminado");
  };

  if (isLoading) {
    return <main className="pt-16 min-h-screen flex items-center justify-center bg-warm-white"><Loader2 size={32} className="text-sand-dark animate-spin" /></main>;
  }

  return (
    <main className="pt-16">
      {isEditingView && (
        <div className="container max-w-3xl mt-6 mb-0 px-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-start gap-2 shadow-sm">
            <span className="text-base">✨</span>
            <span>
              <strong>Modo Edición total.</strong> Haz clic en cualquier título, descripción o el nombre de usuario de Instagram para editarlos.
              Haz clic en fotos para reemplazarlas o añadir nuevas al feed. Idioma activo: <strong>{langLabel}</strong>.
            </span>
          </div>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#faf9f6] relative border-b border-sand-dark/5 overflow-hidden">
        {/* Patrón de cuadrícula de fondo sutil */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e1da_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-40" />
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-sand-light/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="container max-w-5xl px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
            <div className="lg:col-span-8">
              <ScrollReveal>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-px bg-sand-dark" />
                  <span className="text-[10px] md:text-xs font-sans uppercase tracking-[0.3em] text-sand-dark font-semibold">Misión & Arte</span>
                </div>
                <EditableText
                  value={getText('main_title', 'about.title')}
                  onSave={makeSave('main_title')}
                  isEditing={isEditingView}
                  as="h1" className="font-serif text-4xl md:text-6xl lg:text-7xl text-foreground font-light tracking-tight leading-none inline-block" langLabel={langLabel}
                />
              </ScrollReveal>
            </div>
            <div className="lg:col-span-4">
              <ScrollReveal delay={150}>
                <EditableText
                  value={getText('main_subtitle', 'about.subtitle')}
                  onSave={makeSave('main_subtitle')}
                  isEditing={isEditingView}
                  as="p" className="text-sm md:text-base text-muted-foreground leading-relaxed font-light italic inline-block" langLabel={langLabel}
                />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Historia (Diseño Editorial) ────────────────────────────────── */}
      <section className="py-20 md:py-32 bg-white relative">
        <div className="container max-w-5xl px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Imagen con diseño editorial y marco asimétrico */}
            <div className="lg:col-span-6 order-2 lg:order-1 relative">
              <ScrollReveal>
                <div className="relative group">
                  <div className="absolute inset-0 border border-sand-dark/15 translate-x-4 translate-y-4 rounded-xl -z-10 transition-transform group-hover:translate-x-3 group-hover:translate-y-3 duration-500" />
                  <div className="relative overflow-hidden rounded-xl bg-warm-white shadow-[0_15px_30px_-10px_rgba(0,0,0,0.08)]">
                    <EditableImage
                      src={about?.salon_photo_url || ""}
                      alt="Salon AG Beauty"
                      storagePath="about_us_salon"
                      onSave={(url) => update.mutateAsync({ salon_photo_url: url })}
                      isEditing={isEditingView}
                      className="aspect-[4/5] w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                      imgClassName="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Contenido de la historia */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-8 lg:pt-6">
              <ScrollReveal delay={150}>
                <div className="inline-flex items-center gap-2 mb-2 border-b border-sand-dark/10 pb-1">
                  <EditableText
                    value={getText('storyTitle', 'about.storyTitle')}
                    onSave={makeSave('storyTitle')}
                    isEditing={isEditingView}
                    as="h2" 
                    className="text-xs font-sans uppercase tracking-[0.25em] text-sand-dark font-bold inline-block" 
                    langLabel={langLabel}
                  />
                </div>
                
                <div className="space-y-6 text-muted-foreground font-light text-base md:text-lg leading-relaxed">
                  {["story_p1", "story_p2", "story_p3"].map((field) => (
                    <div key={field} className="relative pl-4 border-l border-sand-dark/10 hover:border-sand-dark/30 transition-colors">
                      <EditableText
                        value={getText(field)}
                        onSave={makeSave(field)}
                        isEditing={isEditingView}
                        as="p" 
                        className="font-light leading-relaxed text-sm md:text-base text-muted-foreground" 
                        placeholder="Redacta un párrafo sobre la historia..." 
                        langLabel={langLabel}
                      />
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      {/* ── Valores (Minimalismo Cálido) ────────────────────────────────── */}
      <section className="py-20 md:py-32 bg-[#faf9f6] border-y border-sand-dark/5">
        <div className="container max-w-5xl px-6">
          <ScrollReveal>
            <div className="text-center mb-16 md:mb-24">
              <div className="w-12 h-px bg-sand-dark/30 mx-auto mb-6" />
              <EditableText
                value={getText('valuesTitle', 'about.valuesTitle')}
                onSave={makeSave('valuesTitle')}
                isEditing={isEditingView}
                as="h2" 
                className="font-serif text-3xl md:text-5xl text-foreground font-light tracking-tight inline-block" 
                style={{ lineHeight: "1.1" }} 
                langLabel={langLabel}
              />
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {values.map((v, i) => (
              <ScrollReveal key={v.titleField} delay={i * 150}>
                <div className="group flex flex-col justify-between h-full bg-white p-8 rounded-2xl border border-sand-dark/5 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500">
                  <div>
                    <div className="text-sand-dark/25 font-serif font-extralight text-5xl md:text-6xl mb-6 select-none transition-colors group-hover:text-sand-dark/40 duration-500">
                      0{i + 1}
                    </div>
                    <div className="w-8 h-0.5 bg-sand-dark/20 mb-6 group-hover:w-16 transition-all duration-500 ease-out" />
                    <div className="space-y-4">
                      <EditableText 
                        value={v.title} 
                        onSave={makeSave(v.titleField)} 
                        isEditing={isEditingView} 
                        as="h3" 
                        className="font-serif text-xl text-foreground font-medium tracking-wide inline-block" 
                        langLabel={langLabel} 
                      />
                      <EditableText 
                        value={v.desc} 
                        onSave={makeSave(v.descField)} 
                        isEditing={isEditingView} 
                        as="p" 
                        className="text-sm text-muted-foreground leading-relaxed font-light inline-block" 
                        langLabel={langLabel} 
                      />
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── El Alma del Salón (Ana) ─────────────────────────────────────── */}
      <section className="py-20 md:py-36 bg-white relative">
        <div className="container max-w-5xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Retrato Editorial */}
            <div className="lg:col-span-5 relative">
              <ScrollReveal>
                <div className="relative group max-w-xs md:max-w-sm mx-auto lg:mx-0">
                  <div className="absolute -inset-2 border border-sand-dark/10 rounded-2xl transform rotate-1 -z-10 group-hover:rotate-0 transition-transform duration-500" />
                  <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-sand-light/20 shadow-xl border border-sand-dark/10">
                    <EditableImage
                      src={about?.ana_photo_url || ""}
                      alt="Ana González"
                      storagePath="about_us_ana"
                      onSave={(url) => update.mutateAsync({ ana_photo_url: url })}
                      isEditing={isEditingView}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      imgClassName="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </ScrollReveal>
            </div>
            
            {/* Quote y Filosofía de Ana */}
            <div className="lg:col-span-7 space-y-8">
              <ScrollReveal delay={200}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-px bg-sand-dark" />
                  <EditableText
                    value={getText('teamTitle', 'about.teamTitle')}
                    onSave={makeSave('teamTitle')}
                    isEditing={isEditingView}
                    as="span" 
                    className="text-xs font-sans uppercase tracking-[0.25em] text-sand-dark font-semibold inline-block" 
                    langLabel={langLabel}
                  />
                </div>
                
                <div className="relative">
                  <span className="absolute -top-10 -left-6 text-8xl font-serif text-sand-light/40 select-none pointer-events-none">“</span>
                  <EditableText
                    value={getText('anaQuote', 'about.anaQuote')}
                    onSave={makeSave('anaQuote')}
                    isEditing={isEditingView}
                    as="p"
                    className="font-serif text-xl md:text-2xl lg:text-3xl text-foreground font-light leading-relaxed italic relative z-10 inline-block w-full"
                    langLabel={langLabel}
                  />
                </div>

                <div className="space-y-1 pl-4 border-l-2 border-sand-dark/30">
                  <h4 className="font-serif text-xl text-foreground font-medium">Ana González</h4>
                  <EditableText
                    value={getText('anaRole', 'about.anaRole')}
                    onSave={makeSave('anaRole')}
                    isEditing={isEditingView}
                    as="p" 
                    className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-light inline-block" 
                    langLabel={langLabel}
                  />
                </div>

                {!isEditingView && (
                  <div className="pt-4">
                    <Button variant="hero" size="lg" className="h-14 px-8 text-base shadow-md hover:shadow-sand-dark/10 group" asChild>
                      <Link to="/reservar">
                        {t("about.bookCta")} <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                )}
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      {/* ── Feed Instagram ────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#faf9f6] border-t border-sand-dark/5">
        <div className="container max-w-3xl px-6">
          <ScrollReveal>
            <div className="text-center mb-2">
              <EditableText
                value={getText('feedTitle') || "Nuestro trabajo"}
                onSave={makeSave('feedTitle')}
                isEditing={isEditingView}
                as="h2" className="font-serif text-2xl md:text-3xl text-foreground inline-block" style={{ lineHeight: "1.1" }} langLabel={langLabel}
              />
            </div>
            <div className="text-center mb-10">
              <EditableText
                value={getText('feedSubtitle') || "Cada transformación, una historia"}
                onSave={makeSave('feedSubtitle')}
                isEditing={isEditingView}
                as="p" className="text-sm text-muted-foreground max-w-xs mx-auto inline-block" langLabel={langLabel}
              />
            </div>
          </ScrollReveal>

          <InstagramFeed
            posts={about?.feed_posts || []}
            handle={about?.instagram_handle || "anagonzalez_beauty"}
            isEditingView={isEditingView}
            onAddPost={handleAddPost}
            onDeletePost={handleDeletePost}
            onUpdateHandle={makeSaveDirect('instagram_handle')}
          />
        </div>
      </section>
    </main>
  );
};

export default QuienesSomos;