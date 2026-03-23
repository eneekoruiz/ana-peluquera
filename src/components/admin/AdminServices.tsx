import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, X, Check } from "lucide-react";
import { services as allServices, categoryLabels, type ServiceCategory, type ServiceItem } from "@/lib/services-data";

const AdminServices = () => {
  const [serviceList, setServiceList] = useState<(ServiceItem & { visible: boolean })[]>(
    allServices.map((s) => ({ ...s, visible: true }))
  );

  const toggleVisibility = (id: string) => {
    setServiceList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
    toast.success("Visibilidad actualizada");
  };

  const categories: ServiceCategory[] = ["peluqueria", "masajes"];

  return (
    <ScrollReveal>
      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat} className="bg-card rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-serif text-lg text-foreground">{categoryLabels[cat]}</h2>
              <Button variant="sand" size="sm" className="gap-1" onClick={() => toast.info("Añadir servicio — próximamente")}>
                <Plus size={14} />
                Añadir
              </Button>
            </div>
            <div className="divide-y divide-border">
              {serviceList
                .filter((s) => s.category === cat)
                .map((svc) => {
                  const Icon = svc.icon;
                  return (
                    <div
                      key={svc.id}
                      className={`p-4 flex items-center justify-between gap-4 transition-opacity ${
                        svc.visible ? "" : "opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-sand-light/50 flex items-center justify-center shrink-0">
                          <Icon size={14} className="text-sand-dark" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{svc.label}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{svc.duration}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => toast.info("Editar servicio — próximamente")}
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`gap-1 ${svc.visible ? "text-green-600" : "text-muted-foreground"}`}
                          onClick={() => toggleVisibility(svc.id)}
                        >
                          {svc.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </ScrollReveal>
  );
};

export default AdminServices;
