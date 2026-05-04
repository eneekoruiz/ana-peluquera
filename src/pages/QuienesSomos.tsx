import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { ArrowRight, Heart, Gem, Leaf, Instagram, Plus, Trash2, Loader2, Edit3 } from "lucide-react";
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

const valueIcons = [Heart, Gem, Leaf];

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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-rose-400 to-purple-500 flex items-center justify-center">
          <Instagram size={18} className="text-white" />
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
              className={cn("text-sm font-medium text-foreground flex items-center gap-2", isEditingView && "cursor-pointer hover:text-sand-dark")}
              onClick={() => isEditingView && setIsEditingHandle(true)}
              title={isEditingView ? "Editar usuario" : ""}
            >
              @{handle || "anagonzalez_beauty"} {isEditingView && <Edit3 size={12} className="text-muted-foreground"/>}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Instagram</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {posts.map((post) => (
          <div key={post.id} className="relative group aspect-square rounded-md overflow-hidden bg-sand-light/30">
            <img src={post.image_url} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end p-2">
              {post.caption && <p className="text-[9px] text-white/90 leading-tight opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">{post.caption}</p>}
            </div>
            {isEditingView && (
              <button type="button" onClick={() => onDeletePost(post.id)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                <Trash2 size={10} />
              </button>
            )}
          </div>
        ))}
        {isEditingView && (
          <label className={cn("aspect-square rounded-md border-2 border-dashed border-amber-300 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 transition-colors", uploading && "opacity-60 pointer-events-none")}>
            {uploading ? <Loader2 size={18} className="text-amber-400 animate-spin" /> : <><Plus size={20} className="text-amber-400 mb-1" /><span className="text-[9px] text-amber-600">Añadir foto</span></>}
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

  const values = [1, 2, 3].map((n, i) => ({
    Icon: valueIcons[i],
    title: getText(`value${n}_title`),
    desc: getText(`value${n}_desc`),
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
    return <main className="pt-16 min-h-screen flex items-center justify-center"><Loader2 size={28} className="text-sand-dark animate-spin" /></main>;
  }

  return (
    <main className="pt-16">
      {isEditingView && (
        <div className="container max-w-3xl mt-6 mb-0">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
            <span className="text-base">✨</span>
            <span>
              <strong>Modo Edición total.</strong> Haz clic en cualquier título, descripción o el nombre de usuario de Instagram para editarlos.
              Haz clic en fotos para reemplazarlas o añadir nuevas al feed. Idioma activo: <strong>{langLabel}</strong>.
            </span>
          </div>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="py-14 md:py-24">
        <div className="container max-w-3xl text-center">
          <ScrollReveal>
            <EditableText
              value={getText('main_title', 'about.title')}
              onSave={makeSave('main_title')}
              isEditing={isEditingView}
              as="h1" className="font-serif text-3xl md:text-5xl text-foreground mb-3 inline-block" style={{ lineHeight: "1.05" }} langLabel={langLabel}
            /><br/>
            <EditableText
              value={getText('main_subtitle', 'about.subtitle')}
              onSave={makeSave('main_subtitle')}
              isEditing={isEditingView}
              as="p" className="text-sm text-muted-foreground max-w-sm mx-auto inline-block" langLabel={langLabel}
            />
          </ScrollReveal>
        </div>
      </section>

      {/* ── Historia (Diseño Editorial) ────────────────────────────────── */}
      <section className="py-16 md:py-32 bg-warm-white relative overflow-hidden">
        {/* Decoración sutil de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sand-light/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        
        <div className="container max-w-4xl px-6 relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            
            {/* Imagen con marco decorativo */}
            <div className="md:col-span-5 relative">
              <ScrollReveal>
                <div className="relative z-10">
                  <EditableImage
                    src={about?.ana_photo_url || ""}
                    alt="Ana González"
                    storagePath="about_us"
                    onSave={(url) => update.mutateAsync({ ana_photo_url: url })}
                    isEditing={isEditingView}
                    className="aspect-[4/5] rounded-lg overflow-hidden shadow-2xl grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
                    imgClassName="w-full h-full object-cover"
                  />
                </div>
                {/* Marco decorativo detrás */}
                <div className="absolute -bottom-6 -left-6 w-full h-full border border-sand-dark/20 rounded-lg -z-0 hidden md:block" />
              </ScrollReveal>
            </div>
            
            {/* Texto con tipografía cuidada */}
            <div className="md:col-span-7">
              <ScrollReveal delay={150}>
                <div className="space-y-6">
                  <div className="inline-block border-l-2 border-sand-dark pl-4 mb-2">
                    <EditableText
                      value={getText('storyTitle', 'about.storyTitle')}
                      onSave={makeSave('storyTitle')}
                      isEditing={isEditingView}
                      as="span" 
                      className="text-xs font-sans uppercase tracking-[0.2em] text-sand-dark font-semibold block" 
                      langLabel={langLabel}
                    />
                  </div>
                  
                  <div className="prose prose-sand max-w-none">
                    {["story_p1", "story_p2", "story_p3"].map((field) => (
                      <div key={field} className="mb-6">
                        <EditableText
                          value={getText(field)}
                          onSave={makeSave(field)}
                          isEditing={isEditingView}
                          as="p" 
                          className="text-base md:text-lg text-muted-foreground leading-relaxed font-light italic" 
                          placeholder="Escribe la historia..." 
                          langLabel={langLabel}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>


      {/* ── Valores (Minimalismo Cálido) ────────────────────────────────── */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container max-w-5xl px-6">
          <ScrollReveal>
            <div className="text-center mb-16 md:mb-24">
              <div className="w-12 h-px bg-sand-dark/30 mx-auto mb-6" />
              <EditableText
                value={getText('valuesTitle', 'about.valuesTitle')}
                onSave={makeSave('valuesTitle')}
                isEditing={isEditingView}
                as="h2" 
                className="font-serif text-3xl md:text-5xl text-foreground inline-block tracking-tight" 
                style={{ lineHeight: "1.1" }} 
                langLabel={langLabel}
              />
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {values.map((v, i) => (
              <ScrollReveal key={v.titleField} delay={i * 150}>
                <div className="group text-center">
                  <div className="mb-8 relative inline-block">
                    <div className="w-20 h-20 rounded-full bg-warm-white flex items-center justify-center group-hover:scale-110 group-hover:bg-sand-light/20 transition-all duration-500 ease-out border border-sand-dark/5">
                      <v.Icon size={32} className="text-sand-dark" strokeWidth={1.5} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <EditableText 
                      value={v.title} 
                      onSave={makeSave(v.titleField)} 
                      isEditing={isEditingView} 
                      as="h3" 
                      className="font-serif text-xl text-foreground tracking-wide" 
                      langLabel={langLabel} 
                    />
                    <div className="w-8 h-px bg-sand-dark/20 mx-auto" />
                    <EditableText 
                      value={v.desc} 
                      onSave={makeSave(v.descField)} 
                      isEditing={isEditingView} 
                      as="p" 
                      className="text-sm text-muted-foreground leading-relaxed max-w-[240px] mx-auto font-light" 
                      langLabel={langLabel} 
                    />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>


      {/* ── El Alma del Salón (Ana) ─────────────────────────────────────── */}
      <section className="py-24 md:py-40 bg-warm-white border-y border-sand-dark/5">
        <div className="container max-w-4xl px-6 text-center">
          <ScrollReveal>
            <div className="mb-12">
              <EditableText
                value={getText('teamTitle', 'about.teamTitle')}
                onSave={makeSave('teamTitle')}
                isEditing={isEditingView}
                as="h2" 
                className="font-serif text-3xl md:text-5xl text-foreground inline-block tracking-tight" 
                style={{ lineHeight: "1.1" }} 
                langLabel={langLabel}
              />
            </div>
          </ScrollReveal>
          
          <ScrollReveal delay={200}>
            <div className="relative inline-block group">
              {/* Círculo decorativo giratorio sutil */}
              <div className="absolute -inset-4 border border-dashed border-sand-dark/20 rounded-full animate-[spin_20s_linear_infinite] group-hover:border-sand-dark/40 transition-colors" />
              
              <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full p-2 bg-white shadow-xl">
                <div className="w-full h-full rounded-full overflow-hidden bg-sand-light/20 flex items-center justify-center border border-sand-dark/10">
                  {about?.ana_photo_url ? (
                    <img 
                      src={about.ana_photo_url} 
                      alt="Ana González" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                  ) : (
                    <span className="font-serif text-5xl text-sand-dark/30 italic">AG</span>
                  )}
                </div>
              </div>
              
              <div className="mt-10 space-y-2">
                <h3 className="font-serif text-2xl md:text-3xl text-foreground">Ana González</h3>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-px bg-sand-dark/30" />
                  <EditableText
                    value={getText('anaRole', 'about.anaRole')}
                    onSave={makeSave('anaRole')}
                    isEditing={isEditingView}
                    as="p" 
                    className="text-xs md:text-sm text-sand-dark uppercase tracking-[0.3em] font-medium" 
                    langLabel={langLabel}
                  />
                  <div className="w-8 h-px bg-sand-dark/30" />
                </div>
              </div>
            </div>
          </ScrollReveal>


          {!isEditingView && (
            <ScrollReveal delay={200}>
              <div className="mt-10">
                <Button variant="hero" size="lg" className="h-16 px-10 text-lg w-full sm:w-auto" asChild>
                  <Link to="/reservar">{t("about.bookCta")} <ArrowRight size={20} className="ml-2" /></Link>
                </Button>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* ── Feed Instagram ────────────────────────────────────────────────── */}
      <section className="py-14 md:py-24">
        <div className="container max-w-3xl">
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