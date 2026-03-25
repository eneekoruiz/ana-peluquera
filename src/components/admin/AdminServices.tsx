import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { useServices, getLocalizedLabel } from "@/hooks/useServices";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Scissors, Hand, Sparkles, Paintbrush, Droplets, Palette, Flower2, CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  scissors: Scissors,
  hand: Hand,
  sparkles: Sparkles,
  paintbrush: Paintbrush,
  droplets: Droplets,
  palette: Palette,
  "flower-2": Flower2,
  "circle-dot": CircleDot,
};

const AdminServices = () => {
  const { data: serviceList = [], isLoading } = useServices(true);
  const qc = useQueryClient();

  const toggleVisibility = async (id: string, currentVisible: boolean | null) => {
    const { error } = await supabase.from("services").update({ visible: !currentVisible }).eq("id", id);
    if (error) {
      toast.error("Error al actualizar");
      return;
    }
    qc.invalidateQueries({ queryKey: ["services"] });
    toast.success("Visibilidad actualizada");
  };

  const categories = ["peluqueria", "masajes"] as const;
  const catLabels: Record<string, string> = { peluqueria: "Peluquería", masajes: "Masajes & Bienestar" };

  return (
    <ScrollReveal>
      <div className="space-y-6">
        {isLoading && <p className="text-center text-sm text-muted-foreground py-8">Cargando…</p>}
        {categories.map((cat) => {
          const catServices = serviceList.filter((s) => s.category === cat);
          if (catServices.length === 0) return null;
          return (
            <div key={cat} className="bg-card rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-serif text-lg text-foreground">{catLabels[cat]}</h2>
                <Button variant="sand" size="sm" className="gap-1" onClick={() => toast.info("Añadir servicio — próximamente")}>
                  <Plus size={14} /> Añadir
                </Button>
              </div>
              <div className="divide-y divide-border">
                {catServices.map((svc) => {
                  const Icon = iconMap[svc.icon_name] || Scissors;
                  return (
                    <div
                      key={svc.id}
                      className={`p-4 flex items-center justify-between gap-4 transition-opacity ${svc.visible ? "" : "opacity-50"}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-sand-light/50 flex items-center justify-center shrink-0">
                          <Icon size={14} className="text-sand-dark" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{getLocalizedLabel(svc, "es")}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{svc.duration_min} min</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => toast.info("Editar servicio — próximamente")}>
                          <Pencil size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`gap-1 ${svc.visible ? "text-green-600" : "text-muted-foreground"}`}
                          onClick={() => toggleVisibility(svc.id, svc.visible)}
                        >
                          {svc.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollReveal>
  );
};

export default AdminServices;
