import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Lock, Unlock, Plus, X } from "lucide-react";
import { useBlockedSlots, useCreateBlockedSlot, useDeleteBlockedSlot } from "@/hooks/useBlockedSlots";

const AdminBlocking = () => {
  const { data: blocked = [], isLoading } = useBlockedSlots();
  const createSlot = useCreateBlockedSlot();
  const deleteSlot = useDeleteBlockedSlot();

  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const handleAdd = () => {
    if (!date || !startTime || !endTime) {
      toast.error("Completa fecha y horario");
      return;
    }
    createSlot.mutate(
      { blocked_date: date, start_time: startTime, end_time: endTime, reason: reason || "Sin motivo" },
      {
        onSuccess: () => {
          toast.success("Horario bloqueado");
          setShowForm(false);
          setDate(""); setStartTime(""); setEndTime(""); setReason("");
        },
      }
    );
  };

  const handleRemove = (id: string) => {
    deleteSlot.mutate(id, { onSuccess: () => toast.info("Bloqueo eliminado") });
  };

  return (
    <ScrollReveal>
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-lg text-foreground">Bloqueos de Horario</h2>
          <Button variant="sand" size="sm" className="gap-1" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Bloquear Hora"}
          </Button>
        </div>

        {showForm && (
          <div className="p-4 border-b border-border bg-muted/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-1.5">Fecha</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
              </div>
              <div>
                <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-1.5">Motivo (opcional)</label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Cita personal"
                  className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
              </div>
              <div>
                <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-1.5">Desde</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
              </div>
              <div>
                <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-1.5">Hasta</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
              </div>
            </div>
            <Button variant="hero" size="sm" className="mt-4 gap-1" onClick={handleAdd} disabled={createSlot.isPending}>
              <Lock size={12} /> Confirmar Bloqueo
            </Button>
          </div>
        )}

        <div className="divide-y divide-border">
          {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Cargando…</div>}
          {!isLoading && blocked.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No hay horas bloqueadas</div>
          )}
          {blocked.map((b) => (
            <div key={b.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4">
                <Lock size={14} className="text-sand-dark shrink-0" />
                <div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-foreground tabular-nums">{b.blocked_date}</span>
                    <span className="text-muted-foreground tabular-nums">{b.start_time?.slice(0, 5)} — {b.end_time?.slice(0, 5)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.reason}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(b.id)}>
                <Unlock size={12} /> Desbloquear
              </Button>
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
};

export default AdminBlocking;
