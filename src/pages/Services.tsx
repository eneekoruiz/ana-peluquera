import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import React, { useState, useCallback } from "react";
import {
  ArrowRight, Clock, Timer, Scissors, Hand, Sparkles,
  Paintbrush, Droplets, Palette, Flower2, CircleDot,
  Eye, EyeOff, Plus, GripVertical, Trash2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useServices, useServicesPageContent, useUpdateServicesPageContent, type DBService } from "@/hooks/useServices";
import { useAuth } from "@/contexts/AuthContext";
import EditableText from "@/components/cms/EditableText";
import SortableList from "@/components/cms/SortableList";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 🔥 Importaciones de Firebase
import { db } from "@/lib/firebase";
import { doc, updateDoc, writeBatch, collection, addDoc, deleteDoc } from "firebase/firestore";

const iconOptions = [
  { name: "scissors", Icon: Scissors, label: "Tijeras" },
  { name: "hand", Icon: Hand, label: "Mano" },
  { name: "sparkles", Icon: Sparkles, label: "Destellos" },
  { name: "paintbrush", Icon: Paintbrush, label: "Pincel" },
  { name: "droplets", Icon: Droplets, label: "Gotas" },
  { name: "palette", Icon: Palette, label: "Paleta" },
  { name: "flower-2", Icon: Flower2, label: "Flor" },
  { name: "circle-dot", Icon: CircleDot, label: "Punto" },
];

const iconMap: Record<string, LucideIcon> = iconOptions.reduce(
  (acc, curr) => ({ ...acc, [curr.name]: curr.Icon }), {}
);

const normalize = (str: string) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

const formatPriceValue = (svc: DBService, fromLabel: string): string => {
  if (svc.price_cents !== undefined && svc.price_cents !== null) {
    const euros = (svc.price_cents / 100).toFixed(0);
    return svc.price_from ? `${fromLabel} ${euros}€` : `${euros}€`;
  }
  return "";
};

// ─── Hooks de mutación DIRECTOS a Firebase ────────────────────────────────
const useUpdateService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      await updateDoc(doc(db, "services", id), updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
    onError: (err: Error) => toast.error("Error: " + err.message),
  });
};

const useReorderServices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const batch = writeBatch(db);
      ids.forEach((id, index) => {
        batch.update(doc(db, "services", id), { sort_order: index });
      });
      await batch.commit();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
    onError: (err: Error) => toast.error("Error al reordenar: " + err.message),
  });
};

const useAddService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (category: string) => {
      const newService = {
        label_es: "Nuevo Servicio",
        label_en: "New Service",
        label_eu: "Zerbitzu Berria",
        category: category,
        duration_min: 30,
        phase1_min: 0,
        phase2_min: 0,
        phase3_min: 0,
        icon_name: "scissors",
        price_cents: 0,
        description_es: "Añade una descripción...",
        visible: true,
        sort_order: 999,
      };
      await addDoc(collection(db, "services"), newService);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio creado");
    },
    onError: (err: Error) => toast.error("Error al crear: " + err.message),
  });
};

const useDeleteService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "services", id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio eliminado permanentemente");
    },
    onError: (err: Error) => toast.error("Error al eliminar: " + err.message),
  });
};

// ─── Componentes de Edición ────────────────────────────────────

const EditablePrice = ({ priceCents, onSave }: { priceCents: number | null, onSave: (val: number) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(priceCents ? (priceCents / 100).toString() : "0");

  const handleSave = () => {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) onSave(Math.round(num * 100));
    else setVal(priceCents ? (priceCents / 100).toString() : "0");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 bg-white rounded border border-sand-dark/30 p-1">
        <input 
          autoFocus type="number" value={val} 
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          onBlur={handleSave}
          className="w-12 text-sm font-medium text-right focus:outline-none"
        />
        <span className="text-xs text-muted-foreground mr-1">€</span>
      </div>
    );
  }

  return (
    <span onClick={() => setIsEditing(true)} className="text-sm font-medium text-sand-dark tabular-nums cursor-pointer hover:underline underline-offset-4 decoration-dashed px-1 hover:bg-sand-light/20 rounded-sm">
      {priceCents ? (priceCents / 100).toFixed(0) : 0}€
    </span>
  );
};

const EditableTiming = ({ service, onSave }: { service: DBService, onSave: (updates: any) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isCurrentlySandwich = !!(service.phase1_min && service.phase2_min && service.phase3_min);
  const [isSandwich, setIsSandwich] = useState(isCurrentlySandwich);

  const [dur, setDur] = useState(service.duration_min || 30);
  const [p1, setP1] = useState(service.phase1_min || 45);
  const [p2, setP2] = useState(service.phase2_min || 30);
  const [p3, setP3] = useState(service.phase3_min || 30);

  const handleSave = () => {
    if (isSandwich) {
      onSave({
        duration_min: p1 + p2 + p3,
        phase1_min: p1,
        phase2_min: p2,
        phase3_min: p3
      });
    } else {
      onSave({
        duration_min: dur,
        phase1_min: 0,
        phase2_min: 0,
        phase3_min: 0
      });
    }
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <div 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 cursor-pointer hover:bg-sand-light/30 p-1.5 rounded-md transition-colors border border-transparent hover:border-sand-dark/30 border-dashed relative group"
        title="Configurar Tiempos"
      >
        <Clock size={12} className="text-sand-dark" />
        <span className="text-xs text-sand-dark font-medium tabular-nums">{service.duration_min || 0} min</span>
        
        {isCurrentlySandwich && (
          <>
            <span className="mx-1 text-border">|</span>
            <Timer size={12} className="text-amber-500" />
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full uppercase tracking-wider font-semibold">Sándwich</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="absolute z-50 left-0 bottom-full mb-2 bg-white border border-border shadow-xl rounded-xl p-4 w-72 animate-in fade-in zoom-in-95">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
        <span className="text-sm font-serif font-medium text-foreground">Gestión de Tiempos</span>
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer p-2 bg-sand-light/20 rounded-lg hover:bg-sand-light/40 transition-colors">
          <input 
            type="checkbox" 
            checked={isSandwich} 
            onChange={(e) => setIsSandwich(e.target.checked)} 
            className="rounded text-sand-dark focus:ring-sand-dark" 
          />
          <span className="font-medium text-foreground">Algoritmo Sándwich</span>
        </label>
        <p className="text-[10px] text-muted-foreground mt-1 px-1">
          Permite atender a otro cliente durante el tiempo de espera (ej. Mechas).
        </p>
      </div>

      {isSandwich ? (
        <div className="space-y-3 bg-card p-3 rounded-lg border border-border">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">1. Aplicación</span>
            <div className="flex items-center gap-1">
              <input type="number" min="0" value={p1} onChange={(e)=>setP1(Number(e.target.value))} className="w-14 border border-border rounded px-1.5 py-1 text-right bg-background focus:outline-none focus:border-sand-dark" /> 
              <span className="text-muted-foreground">min</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-amber-600 font-medium">2. Espera (Libre)</span>
            <div className="flex items-center gap-1">
              <input type="number" min="0" value={p2} onChange={(e)=>setP2(Number(e.target.value))} className="w-14 border border-amber-300 rounded px-1.5 py-1 text-right bg-amber-50 focus:outline-none focus:border-amber-500 text-amber-700" /> 
              <span className="text-muted-foreground">min</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">3. Lavado / Fin</span>
            <div className="flex items-center gap-1">
              <input type="number" min="0" value={p3} onChange={(e)=>setP3(Number(e.target.value))} className="w-14 border border-border rounded px-1.5 py-1 text-right bg-background focus:outline-none focus:border-sand-dark" /> 
              <span className="text-muted-foreground">min</span>
            </div>
          </div>
          <div className="pt-2 border-t border-border mt-2 flex justify-between items-center text-sm font-bold text-foreground">
            <span>Total Bloqueado:</span>
            <span>{p1 + p2 + p3} min</span>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center text-sm p-3 bg-card rounded-lg border border-border">
          <span className="text-foreground font-medium">Duración total</span>
          <div className="flex items-center gap-1">
            <input type="number" min="0" value={dur} onChange={(e)=>setDur(Number(e.target.value))} className="w-16 border border-border rounded px-2 py-1 text-right bg-background focus:outline-none focus:border-sand-dark font-medium" /> 
            <span className="text-muted-foreground text-xs">min</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button size="sm" className="flex-1 h-9 text-xs font-medium" onClick={handleSave}>Guardar</Button>
        <Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-medium" onClick={() => setIsOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
};

const IconSelector = ({ currentIcon, onSave }: { currentIcon: string, onSave: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const CurrentIconComp = iconMap[currentIcon] || Scissors;

  return (
    <div className="relative">
      <div onClick={() => setIsOpen(!isOpen)} className="w-10 h-10 rounded-lg bg-sand-light/50 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer hover:ring-2 hover:ring-sand-dark/20">
        <CurrentIconComp size={18} className="text-sand-dark" />
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-12 left-0 z-50 bg-white border border-border shadow-xl rounded-xl p-2 grid grid-cols-4 gap-1 w-48">
            {iconOptions.map((opt) => (
              <button key={opt.name} onClick={() => { onSave(opt.name); setIsOpen(false); }} className={cn("p-2 rounded-md flex items-center justify-center", currentIcon === opt.name ? "bg-sand-dark text-white" : "hover:bg-sand-light/50 text-muted-foreground")}>
                <opt.Icon size={16} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────

const Services = () => {
  const { lang, t } = useLanguage();
  const { isEditingView } = useAuth();
  
  const { data: dbServices = [], isLoading } = useServices(isEditingView);
  const updateService = useUpdateService();
  const reorderServices = useReorderServices();
  const addService = useAddService();
  const deleteService = useDeleteService();

  const { data: pageContent } = useServicesPageContent();
  const updatePageContent = useUpdateServicesPageContent();

  const [localOrder, setLocalOrder] = useState<Record<string, DBService[]>>({});
  const categories = ["peluqueria", "masajes"] as const;

  const handleUpdateField = useCallback((id: string, field: string, value: any) => {
    updateService.mutate({ id, updates: { [field]: value } });
  }, [updateService]);

  const handleUpdateMultipleFields = useCallback((id: string, updates: any) => {
    updateService.mutate({ id, updates });
  }, [updateService]);

  const handleReorder = useCallback((cat: string, reordered: DBService[]) => {
    setLocalOrder((prev) => ({ ...prev, [cat]: reordered }));
    reorderServices.mutate(reordered.map((s) => s.id));
  }, [reorderServices]);

  const handleDelete = useCallback((id: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este servicio de forma permanente? Esta acción no se puede deshacer.")) {
      deleteService.mutate(id);
    }
  }, [deleteService]);

  const langLabel = lang === "es" ? "Español" : lang === "en" ? "English" : "Euskara";

  const displayTitle = pageContent?.[`title_${lang}`] || t("services.title");
  const displaySubtitle = pageContent?.[`subtitle_${lang}`] || t("services.subtitle");

  return (
    <main className="pt-16 pb-20 bg-warm-white min-h-screen relative overflow-hidden">
      {/* Decoración de fondo premium */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-sand-light/10 to-transparent -z-0" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-sand-light/10 rounded-full blur-3xl -z-0" />
      
      <section className="py-12 md:py-24 relative z-10">
        <div className="container max-w-4xl px-6">
          
          <ScrollReveal>
            <div className="text-center mb-16 md:mb-24">
              <div className="inline-block px-3 py-1 bg-sand-light/20 rounded-full text-[10px] uppercase tracking-[0.3em] text-sand-dark font-semibold mb-6">
                {t("nav.services")}
              </div>
              <h1 className="font-serif text-4xl md:text-6xl text-foreground mb-6 inline-block leading-tight">
                <EditableText
                  value={displayTitle}
                  onSave={async (val) => await updatePageContent.mutateAsync({ [`title_${lang}`]: val })}
                  isEditing={isEditingView}
                  as="span"
                />
              </h1>
              <div className="max-w-md mx-auto h-px bg-sand-dark/20 mb-6" />
              <div className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
                <EditableText
                  value={displaySubtitle}
                  onSave={async (val) => await updatePageContent.mutateAsync({ [`subtitle_${lang}`]: val })}
                  isEditing={isEditingView}
                  as="p"
                  langLabel={langLabel}
                />
              </div>
            </div>
          </ScrollReveal>

          {isEditingView && (
            <div className="mb-12 bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 text-xs text-amber-800 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">✨</span>
                <strong className="text-sm">Panel de Gestión de Servicios</strong>
              </div>
              <p className="pl-7 opacity-80 leading-relaxed">
                Haz clic en cualquier texto o precio para editarlo. Usa el icono de <strong>reloj</strong> para configurar la duración y activar el Algoritmo Sándwich. Arrastra los servicios desde el icono ⣿ para cambiar su orden de aparición.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center py-24">
              <div className="w-10 h-10 border-2 border-sand-dark/20 border-t-sand-dark rounded-full animate-spin mb-4" />
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Cargando catálogo...</p>
            </div>
          )}

          {categories.map((cat, ci) => {
            const catServices = (localOrder[cat] ?? dbServices).filter((s) => normalize(s.category) === normalize(cat));
            if (!isEditingView && catServices.length === 0) return null;

            return (
              <div key={cat} className={ci > 0 ? "mt-24 md:mt-32" : ""}>
                <ScrollReveal>
                  <div className="flex items-center gap-6 mb-10">
                    <h2 className="text-sm font-sans font-bold uppercase tracking-[0.4em] text-sand-dark whitespace-nowrap">
                      {t(`booking.categories.${cat}`)}
                    </h2>
                    <div className="h-px bg-sand-dark/20 flex-1" />
                  </div>
                </ScrollReveal>

                <SortableList
                  items={catServices}
                  isDraggable={isEditingView}
                  onReorder={(reordered) => handleReorder(cat, reordered as DBService[])}
                  renderItem={(svc: DBService, i) => {
                    const StaticIcon = iconMap[svc.icon_name] || Scissors;
                    const name = (lang === "en" ? svc.label_en : lang === "eu" ? svc.label_eu : svc.label_es) || svc.label_es || svc.name;
                    const description = (lang === "en" ? svc.description_en : lang === "eu" ? svc.description_eu : svc.description_es) || svc.description_es || "";
                    const isHidden = svc.visible === false;

                    return (
                      <ScrollReveal key={svc.id} delay={i * 80}>
                        <div className={cn(
                          "bg-white rounded-2xl p-6 md:p-8 mb-6 transition-all duration-500 border relative group",
                          isHidden 
                            ? "border-dashed border-amber-200 opacity-60 bg-amber-50/5 grayscale" 
                            : "border-sand-dark/10 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
                        )}>
                          
                          {isEditingView && (
                            <div className="absolute top-8 left-2 text-muted-foreground/30 cursor-grab hover:text-sand-dark active:cursor-grabbing">
                              <GripVertical size={20} />
                            </div>
                          )}

                          <div className={cn("flex flex-col md:flex-row items-start gap-6", isEditingView && "pl-6")}>
                            {/* Icono / Visual */}
                            <div className="shrink-0">
                              {isEditingView ? (
                                <IconSelector currentIcon={svc.icon_name || "scissors"} onSave={(newIcon) => handleUpdateField(svc.id, "icon_name", newIcon)} />
                              ) : (
                                <div className="w-14 h-14 rounded-2xl bg-warm-white flex items-center justify-center border border-sand-dark/5 group-hover:bg-sand-light/20 transition-colors duration-500">
                                  <StaticIcon size={24} className="text-sand-dark" strokeWidth={1.5} />
                                </div>
                              )}
                            </div>

                            {/* Contenido Principal */}
                            <div className="flex-1 min-w-0 w-full">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <EditableText
                                  value={name}
                                  onSave={async (v) => handleUpdateField(svc.id, `label_${lang}`, v)}
                                  isEditing={isEditingView}
                                  as="h3" className="font-serif text-xl md:text-2xl text-foreground tracking-tight"
                                />
                                
                                <div className="flex items-center gap-3">
                                  {isEditingView ? (
                                    <EditablePrice priceCents={svc.price_cents} onSave={(val) => handleUpdateField(svc.id, "price_cents", val)} />
                                  ) : (
                                    <div className="bg-sand-light/10 px-3 py-1 rounded-full">
                                      <span className="text-lg font-serif font-medium text-sand-dark tabular-nums">
                                        {formatPriceValue(svc, t("services.from"))}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="max-w-2xl">
                                <EditableText
                                  value={description}
                                  onSave={async (v) => handleUpdateField(svc.id, `description_${lang}`, v)}
                                  isEditing={isEditingView}
                                  as="p" className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6 font-light italic" placeholder="Añade una descripción..."
                                />
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-sand-dark/5">
                                <div className="flex items-center gap-4">
                                  {isEditingView ? (
                                    <EditableTiming 
                                      service={svc} 
                                      onSave={(updates) => handleUpdateMultipleFields(svc.id, updates)} 
                                    />
                                  ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Timer size={14} className="text-sand-dark/40" />
                                      <span className="text-xs font-medium uppercase tracking-widest tabular-nums">{svc.duration_min || 0} min</span>
                                    </div>
                                  )}
                                </div>

                                {isEditingView ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateField(svc.id, "visible", !svc.visible)}
                                      className={cn("flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full transition-all", isHidden ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-secondary hover:bg-secondary/80 text-muted-foreground")}
                                    >
                                      {isHidden ? <><EyeOff size={12} /> Oculto</> : <><Eye size={12} /> Visible</>}
                                    </button>
                                    
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(svc.id)}
                                      className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all duration-300"
                                      title="Eliminar permanentemente"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <Button variant="outline" size="sm" className="rounded-full px-6 hover:bg-sand-dark hover:text-white transition-all duration-500 border-sand-dark/20" asChild>
                                    <a href="/reservar">Reservar <ArrowRight size={14} className="ml-2" /></a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </ScrollReveal>
                    );
                  }}
                />

                {isEditingView && (
                  <button type="button" onClick={() => addService.mutate(cat)} disabled={addService.isPending} className="mt-8 w-full flex items-center justify-center gap-3 py-6 border-2 border-dashed border-sand-dark/20 rounded-2xl text-xs font-bold uppercase tracking-widest text-sand-dark/60 hover:bg-sand-light/10 hover:border-sand-dark/40 transition-all duration-500 group">
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" /> 
                    Añadir nuevo servicio en "{t(`booking.categories.${cat}`)}"
                  </button>
                )}
              </div>
            );
          })}

        </div>
      </section>
    </main>
  );
};

export default Services;