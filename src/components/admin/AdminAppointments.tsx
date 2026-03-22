import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Check, X, Phone, ChevronLeft, ChevronRight } from "lucide-react";

interface Appointment {
  id: string;
  client: string;
  phone: string;
  service: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled";
}

const generateMockAppointments = (): Appointment[] => [
  { id: "C-001", client: "Elena Rodríguez", phone: "612 345 678", service: "Corte", time: "09:30", status: "confirmed" },
  { id: "C-002", client: "Marta Ibáñez", phone: "654 987 321", service: "Color + Mechas", time: "10:30", status: "pending" },
  { id: "C-003", client: "Lucía Fernández", phone: "678 112 233", service: "Tratamiento Capilar", time: "12:00", status: "confirmed" },
  { id: "C-004", client: "Isabel Martínez", phone: "699 445 667", service: "Manicura", time: "15:00", status: "pending" },
  { id: "C-005", client: "Rosa Sánchez", phone: "611 223 344", service: "Peinado", time: "17:00", status: "confirmed" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmada", className: "bg-green-50 text-green-700" },
  pending: { label: "Pendiente", className: "bg-sand-light text-sand-dark" },
  cancelled: { label: "Cancelada", className: "bg-red-50 text-red-600" },
};

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState(generateMockAppointments);
  const [dayOffset, setDayOffset] = useState(0);

  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + dayOffset);
  const dateStr = currentDate.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const handleConfirm = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "confirmed" as const } : a))
    );
    toast.success("Cita confirmada");
  };

  const handleCancel = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelled" as const } : a))
    );
    toast.error("Cita cancelada");
  };

  const active = appointments.filter((a) => a.status !== "cancelled");
  const cancelled = appointments.filter((a) => a.status === "cancelled");

  return (
    <ScrollReveal>
      {/* Day navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => setDayOffset((d) => d - 1)} className="gap-1">
          <ChevronLeft size={14} />
          Anterior
        </Button>
        <div className="text-center">
          <p className="font-serif text-lg text-foreground capitalize">{dateStr}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {active.length} cita{active.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setDayOffset((d) => d + 1)} className="gap-1">
          Siguiente
          <ChevronRight size={14} />
        </Button>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {active.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No hay citas para este día
          </div>
        )}
        {active.map((apt) => {
          const status = statusConfig[apt.status];
          return (
            <div
              key={apt.id}
              className="bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  {/* Time block */}
                  <div className="w-14 text-center shrink-0">
                    <span className="text-lg font-medium tabular-nums text-foreground">{apt.time}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{apt.service}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-sans uppercase tracking-wide ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{apt.client}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Phone size={10} />
                      <span className="tabular-nums">{apt.phone}</span>
                    </div>
                  </div>
                </div>

                {apt.status === "pending" && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="sand"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleConfirm(apt.id)}
                    >
                      <Check size={12} />
                      Confirmar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => handleCancel(apt.id)}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancelled */}
      {cancelled.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-sans uppercase tracking-wide text-muted-foreground mb-3">
            Canceladas ({cancelled.length})
          </p>
          <div className="space-y-2">
            {cancelled.map((apt) => (
              <div key={apt.id} className="bg-card/50 rounded-lg p-3 opacity-60">
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums text-muted-foreground">{apt.time}</span>
                  <span className="text-sm text-muted-foreground line-through">{apt.service}</span>
                  <span className="text-sm text-muted-foreground">{apt.client}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ScrollReveal>
  );
};

export default AdminAppointments;
