import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Check, X, Phone, ChevronLeft, ChevronRight, Unlock, MessageCircle, Lock, Trash2, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useServices, getLocalizedLabel } from "@/hooks/useServices";

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmada", className: "bg-green-50 text-green-700" },
  pending: { label: "Pendiente", className: "bg-sand-light text-sand-dark" },
  cancelled: { label: "Cancelada", className: "bg-red-50 text-red-600" },
};

const getLocalDateStr = (d: Date) => {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const AdminAppointments = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { data: services = [] } = useServices(true);

  const displayDate = selectedDate.toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long",
  });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const dateStr = getLocalDateStr(selectedDate);
      const q = query(collection(db, "bookings"), where("date", "==", dateStr));
      const snap = await getDocs(q);
      
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Ordenamos todo por hora de inicio (citas y bloqueos)
      data.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
      
      setBookings(data);
    } catch (error) {
      console.error("Error al cargar citas:", error);
      toast.error("No se pudieron cargar las citas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedDate]);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return "—";
    const svc = services.find((s) => s.id === serviceId);
    return svc ? getLocalizedLabel(svc, "es") : "—";
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), { status: newStatus });
      toast.success(newStatus === "confirmed" ? "Cita confirmada" : "Cita cancelada");
      fetchBookings();
    } catch (error) {
      toast.error("Error al actualizar la cita");
    }
  };

  const handleReleaseSlot = async (id: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), { phase2_released: true, current_phase: "phase2_released" });
      toast.success("Fase 2 liberada — hueco disponible");
      fetchBookings();
    } catch (error) {
      toast.error("Error al liberar la fase");
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este bloqueo manual?")) return;
    try {
      await deleteDoc(doc(db, "bookings", id));
      toast.success("Bloqueo eliminado");
      fetchBookings();
    } catch (error) {
      toast.error("Error al eliminar el bloqueo");
    }
  };

  const active = bookings.filter((a) => a.status !== "cancelled" && a.type !== "block");
  const cancelled = bookings.filter((a) => a.status === "cancelled");
  const blocks = bookings.filter((a) => a.type === "block");

  return (
    <ScrollReveal>
      {/* Navegador de Días */}
      <div className="flex items-center justify-between mb-6 bg-card p-2 rounded-xl border border-border shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => changeDate(-1)} className="text-muted-foreground gap-1">
          <ChevronLeft size={16} /> Anterior
        </Button>
        <div className="text-center">
          <p className="font-serif text-lg text-foreground capitalize">{displayDate}</p>
          <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
            {loading ? "Cargando…" : `${active.length} cita(s) | ${blocks.length} bloqueo(s)`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => changeDate(1)} className="text-muted-foreground gap-1">
          Siguiente <ChevronRight size={16} />
        </Button>
      </div>

      <div className="space-y-3">
        {!loading && bookings.filter(b => b.status !== "cancelled").length === 0 && (
          <div className="text-center p-12 border border-dashed rounded-xl bg-card/50">
            <AlertCircle size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-base font-medium text-foreground">Día despejado</p>
            <p className="text-sm text-muted-foreground mt-1">No hay citas ni bloqueos programados.</p>
          </div>
        )}
        
        {bookings.filter(b => b.status !== "cancelled").map((booking) => {
          
          // 🔥 RENDERIZAR BLOQUEO MANUAL
          if (booking.type === "block") {
            return (
              <div key={booking.id} className="relative overflow-hidden bg-muted/30 border border-border/50 rounded-xl p-4 flex items-center justify-between gap-4 opacity-80 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center shrink-0">
                    <Lock size={18} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base text-muted-foreground line-through decoration-muted-foreground/30">
                      {booking.client_name || "Bloqueo"}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5 tabular-nums">
                      {booking.start_time} - {booking.end_time}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteBlock(booking.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                  <Trash2 size={16} />
                </Button>
              </div>
            );
          }

          // 🔥 RENDERIZAR CITA NORMAL
          const status = statusConfig[booking.status || "pending"];
          const hasSandwich = booking.current_phase === "phase2" && !booking.phase2_released;
          const assignedName = booking.employee_id === "ana_id" || booking.employee_id === "ana" ? "Ana" : "Refuerzo";
          
          return (
            <div key={booking.id} className="bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 border border-border">
              <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex gap-4 min-w-0">
                  <div className="w-14 h-14 bg-sand-light/30 rounded-full flex flex-col items-center justify-center shrink-0 border border-sand-dark/10">
                    <span className="text-sm font-bold text-sand-dark tracking-widest tabular-nums">
                      {booking.start_time?.slice(0, 5)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                        {getServiceName(booking.service_id)}
                      </span>
                      {status && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-sans uppercase tracking-wide shrink-0 ${status.className}`}>
                          {status.label}
                        </span>
                      )}
                      {booking.current_phase === "phase2" && !booking.phase2_released && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-sans uppercase tracking-wide bg-amber-50 text-amber-700 shrink-0">
                          Fase 2
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-sans uppercase tracking-widest text-muted-foreground shrink-0 border border-border">
                        {assignedName}
                      </span>
                    </div>
                    <p className="text-sm font-serif text-muted-foreground truncate">{booking.client_name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone size={12} />
                        <span className="tabular-nums">{booking.client_phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Fin aprox:</span> <span className="tabular-nums">{booking.end_time || "?"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTONERA DE ACCIONES */}
                <div className="flex gap-1.5 shrink-0 w-full sm:w-auto justify-end sm:justify-start mt-2 sm:mt-0">
                  {hasSandwich && (
                    <Button variant="sand" size="sm" className="gap-1 text-xs h-8" onClick={() => handleReleaseSlot(booking.id)}>
                      <Unlock size={14} /> Liberar
                    </Button>
                  )}
                  {booking.status === "pending" && (
                    <>
                      <Button variant="sand" size="sm" className="gap-1 text-xs h-8" onClick={() => handleUpdateStatus(booking.id, "confirmed")}>
                        <Check size={14} /> Confirmar
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleUpdateStatus(booking.id, "cancelled")}>
                        <X size={16} />
                      </Button>
                    </>
                  )}
                  {booking.status !== "cancelled" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" asChild>
                      <a
                        href={`https://wa.me/34${booking.client_phone?.replace(/\s/g, "")}?text=${encodeURIComponent(
                          `Hola ${booking.client_name}, te recordamos tu cita en AG Beauty Salon el ${displayDate} a las ${booking.start_time?.slice(0, 5)} con ${assignedName}. ¡Te esperamos!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Recordatorio WhatsApp"
                      >
                        <MessageCircle size={16} />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Citas Canceladas al final */}
      {cancelled.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs font-sans uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <X size={14} /> Canceladas ({cancelled.length})
          </p>
          <div className="space-y-2">
            {cancelled.map((apt) => (
              <div key={apt.id} className="bg-card/30 border border-border/50 rounded-lg p-3 opacity-60">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-sm font-bold tabular-nums text-muted-foreground">{apt.start_time?.slice(0, 5)}</span>
                  <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">{getServiceName(apt.service_id)}</span>
                  <span className="text-sm text-muted-foreground font-serif">{apt.client_name}</span>
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