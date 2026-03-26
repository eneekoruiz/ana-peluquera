import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Check, X, Phone, ChevronLeft, ChevronRight, Unlock, MessageCircle } from "lucide-react";
import { useBookingsByDate, useUpdateBooking } from "@/hooks/useBookings";
import { useServices, getLocalizedLabel } from "@/hooks/useServices";

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmada", className: "bg-green-50 text-green-700" },
  pending: { label: "Pendiente", className: "bg-sand-light text-sand-dark" },
  cancelled: { label: "Cancelada", className: "bg-red-50 text-red-600" },
};

const AdminAppointments = () => {
  const [dayOffset, setDayOffset] = useState(0);

  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + dayOffset);
  const dateStr = currentDate.toISOString().slice(0, 10);
  const displayDate = currentDate.toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long",
  });

  const { data: bookings = [], isLoading } = useBookingsByDate(dateStr);
  const { data: services = [] } = useServices(true);
  const updateBooking = useUpdateBooking();

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return "—";
    const svc = services.find((s) => s.id === serviceId);
    return svc ? getLocalizedLabel(svc, "es") : "—";
  };

  const handleConfirm = (id: string) => {
    updateBooking.mutate({ id, status: "confirmed" });
    toast.success("Cita confirmada");
  };

  const handleCancel = (id: string) => {
    updateBooking.mutate({ id, status: "cancelled" });
    toast.error("Cita cancelada");
  };

  const handleReleaseSlot = (id: string) => {
    updateBooking.mutate({ id, phase2_released: true, current_phase: "phase2_released" });
    toast.success("Fase 2 liberada — hueco disponible");
  };

  const active = bookings.filter((a) => a.status !== "cancelled");
  const cancelled = bookings.filter((a) => a.status === "cancelled");

  return (
    <ScrollReveal>
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => setDayOffset((d) => d - 1)} className="gap-1">
          <ChevronLeft size={14} /> Anterior
        </Button>
        <div className="text-center">
          <p className="font-serif text-lg text-foreground capitalize">{displayDate}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {isLoading ? "Cargando…" : `${active.length} cita${active.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setDayOffset((d) => d + 1)} className="gap-1">
          Siguiente <ChevronRight size={14} />
        </Button>
      </div>

      <div className="space-y-3">
        {!isLoading && active.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No hay citas para este día
          </div>
        )}
        {active.map((apt) => {
          const status = statusConfig[apt.status || "pending"];
          const hasSandwich = apt.current_phase === "phase2" && !apt.phase2_released;
          return (
            <div key={apt.id} className="bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="w-14 text-center shrink-0">
                    <span className="text-lg font-medium tabular-nums text-foreground">
                      {apt.start_time?.slice(0, 5)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {getServiceName(apt.service_id)}
                      </span>
                      {status && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-sans uppercase tracking-wide ${status.className}`}>
                          {status.label}
                        </span>
                      )}
                      {apt.current_phase === "phase2" && !apt.phase2_released && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-sans uppercase tracking-wide bg-amber-50 text-amber-700">
                          Fase 2
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{apt.client_name}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Phone size={10} />
                      <span className="tabular-nums">{apt.client_phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  {hasSandwich && (
                    <Button variant="sand" size="sm" className="gap-1" onClick={() => handleReleaseSlot(apt.id)}>
                      <Unlock size={12} /> Liberar
                    </Button>
                  )}
                  {apt.status === "pending" && (
                    <>
                      <Button variant="sand" size="sm" className="gap-1" onClick={() => handleConfirm(apt.id)}>
                        <Check size={12} /> Confirmar
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => handleCancel(apt.id)}>
                        <X size={12} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cancelled.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-sans uppercase tracking-wide text-muted-foreground mb-3">
            Canceladas ({cancelled.length})
          </p>
          <div className="space-y-2">
            {cancelled.map((apt) => (
              <div key={apt.id} className="bg-card/50 rounded-lg p-3 opacity-60">
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums text-muted-foreground">{apt.start_time?.slice(0, 5)}</span>
                  <span className="text-sm text-muted-foreground line-through">{getServiceName(apt.service_id)}</span>
                  <span className="text-sm text-muted-foreground">{apt.client_name}</span>
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
