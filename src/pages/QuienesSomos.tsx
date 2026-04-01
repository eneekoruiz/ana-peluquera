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

      {/* ── Historia ────────────────────────────────────────────────────── */}
      <section className="py-14 md:py-24 bg-warm-white">
        <div className="container max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12 items-center">
            <ScrollReveal>
              <div className="md:col-span-2">
                <EditableImage
                  src={about?.ana_photo_url || ""}
                  alt="Ana González"
                  storagePath="about_us"
                  onSave={(url) => update.mutateAsync({ ana_photo_url: url })}
                  isEditing={isEditingView}
                  className="aspect-[3/4] rounded-lg overflow-hidden bg-sand-light/40"
                  imgClassName="w-full h-full object-cover"
                />
              </div>
            </ScrollReveal>

            <div className="md:col-span-3">
              <ScrollReveal delay={100}>
                <div className="mb-4">
                  <EditableText
                    value={getText('storyTitle', 'about.storyTitle')}
                    onSave={makeSave('storyTitle')}
                    isEditing={isEditingView}
                    as="span" className="text-[10px] font-sans uppercase tracking-widest-plus text-sand-dark block" langLabel={langLabel}
                  />
                </div>
                {["story_p1", "story_p2", "story_p3"].map((field) => (
                  <EditableText
                    key={field}
                    value={getText(field)}
                    onSave={makeSave(field)}
                    isEditing={isEditingView}
                    as="p" className="text-sm text-muted-foreground leading-relaxed mb-4" placeholder="Escribe la historia..." langLabel={langLabel}
                  />
                ))}
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Valores ──────────────────────────────────────────────────────── */}
      <section className="py-14 md:py-24">
        <div className="container max-w-3xl">
          <ScrollReveal>
            <div className="text-center mb-10 md:mb-14">
              <EditableText
                value={getText('valuesTitle', 'about.valuesTitle')}
                onSave={makeSave('valuesTitle')}
                isEditing={isEditingView}
                as="h2" className="font-serif text-2xl md:text-4xl text-foreground inline-block" style={{ lineHeight: "1.1" }} langLabel={langLabel}
              />
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {values.map((v, i) => (
              <ScrollReveal key={v.titleField} delay={i * 120}>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <v.Icon size={24} className="mx-auto text-sand-dark mb-4" />
                  <EditableText value={v.title} onSave={makeSave(v.titleField)} isEditing={isEditingView} as="h3" className="font-serif text-base text-foreground mb-2" langLabel={langLabel} />
                  <EditableText value={v.desc} onSave={makeSave(v.descField)} isEditing={isEditingView} as="p" className="text-xs text-muted-foreground leading-relaxed" langLabel={langLabel} />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Equipo / Ana ─────────────────────────────────────────────────── */}
      <section className="py-14 md:py-24 bg-warm-white">
        <div className="container max-w-2xl text-center">
          <ScrollReveal>
            <div className="mb-8">
              <EditableText
                value={getText('teamTitle', 'about.teamTitle')}
                onSave={makeSave('teamTitle')}
                isEditing={isEditingView}
                as="h2" className="font-serif text-2xl md:text-4xl text-foreground inline-block" style={{ lineHeight: "1.1" }} langLabel={langLabel}
              />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="inline-block">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-sand-light/40 mx-auto mb-4 flex items-center justify-center">
                {about?.ana_photo_url ? (
                  <img src={about.ana_photo_url} alt="Ana" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif text-3xl text-sand-dark/30">AG</span>
                )}
              </div>
              <h3 className="font-serif text-lg text-foreground">Ana González</h3>
              <EditableText
                value={getText('anaRole', 'about.anaRole')}
                onSave={makeSave('anaRole')}
                isEditing={isEditingView}
                as="p" className="text-xs text-muted-foreground uppercase tracking-widest-plus mt-1 inline-block" langLabel={langLabel}
              />
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