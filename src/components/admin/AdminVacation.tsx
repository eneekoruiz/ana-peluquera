import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUpdateAdminSettings, type AdminSettings } from "@/hooks/useAdminSettings";
import { CalendarOff, X } from "lucide-react";

interface Props {
  settings: AdminSettings | undefined;
  onClose: () => void;
}

const AdminVacation = ({ settings, onClose }: Props) => {
  const [start, setStart] = useState(settings?.vacation_start || "");
  const [end, setEnd] = useState(settings?.vacation_end || "");
  const updateSettings = useUpdateAdminSettings();

  const handleSave = () => {
    if (!start || !end) {
      toast.error("Selecciona ambas fechas");
      return;
    }
    updateSettings.mutate(
      { vacation_start: start, vacation_end: end },
      { onSuccess: () => { toast.success("Vacaciones configuradas"); onClose(); } }
    );
  };

  const handleClear = () => {
    updateSettings.mutate(
      { vacation_start: null, vacation_end: null },
      { onSuccess: () => { toast.info("Vacaciones eliminadas"); onClose(); } }
    );
  };

  return (
    <div className="bg-card rounded-lg shadow-sm p-4 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarOff size={16} className="text-sand-dark" />
          <h3 className="text-sm font-medium text-foreground">Configurar Vacaciones</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-1.5">Desde</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
        <div>
          <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-1.5">Hasta</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="hero" size="sm" onClick={handleSave}>Guardar</Button>
        {settings?.vacation_start && (
          <Button variant="outline" size="sm" onClick={handleClear}>Eliminar vacaciones</Button>
        )}
      </div>
    </div>
  );
};

export default AdminVacation;
