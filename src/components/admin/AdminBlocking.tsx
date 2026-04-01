import { useState, useEffect } from "react";
import { Lock, Trash2, Plus, AlertTriangle, Phone, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

const timeToMins = (t: string) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const AdminBlocking = () => {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🔥 Control del Modal (Ventana Emergente)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  // Sistema Anti-Colisiones
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showWarning, setShowWarning] = useState(false);

  const fetchBlocks = async () => {
    try {
      const q = query(collection(db, "bookings"), where("type", "==", "block"));
      const snap = await getDocs(q);
      const loadedBlocks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenar por fecha
      loadedBlocks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setBlocks(loadedBlocks);
    } catch (error) {
      console.error("Error cargando bloqueos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  // Función para abrir el modal limpio
  const openModal = () => {
    setDate(""); setStartTime(""); setEndTime(""); setReason("");
    setShowWarning(false); setConflicts([]);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleCheckAndSave = async () => {
    if (!date || !startTime || !endTime) {
      toast.error("Rellena fecha, hora de inicio y fin");
      return;
    }
    if (startTime >= endTime) {
      toast.error("La hora de inicio debe ser anterior a la de fin");
      return;
    }

    setIsSubmitting(true);

    try {
      const q = query(collection(db, "bookings"), where("date", "==", date));
      const snap = await getDocs(q);
      const dayBookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const blockStart = timeToMins(startTime);
      const blockEnd = timeToMins(endTime);

      const overlappingBookings = dayBookings.filter(b => {
        if (b.type === "block" || b.status === "cancelled") return false;
        
        const bStart = timeToMins(b.start_time);
        const bEnd = b.end_time ? timeToMins(b.end_time) : bStart + (b.duration_min || 30);

        return bStart < blockEnd && bEnd > blockStart;
      });

      if (overlappingBookings.length > 0) {
        setConflicts(overlappingBookings);
        setShowWarning(true);
        setIsSubmitting(false);
        return;
      }

      await executeBlock();

    } catch (error) {
      console.error(error);
      toast.error("Error al comprobar disponibilidad");
      setIsSubmitting(false);
    }
  };

  const executeBlock = async () => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "bookings"), {
        type: "block",
        date,
        start_time: startTime,
        end_time: endTime,
        client_name: reason || "Bloqueo de agenda",
        status: "confirmed",
        created_at: new Date().toISOString()
      });
      toast.success("Horario bloqueado correctamente");
      closeModal(); // Cerramos el modal al guardar con éxito
      fetchBlocks();
    } catch (error) {
      toast.error("Error al guardar el bloqueo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Desbloquear este horario?")) return;
    try {
      await deleteDoc(doc(db, "bookings", id));
      toast.success("Horario desbloqueado");
      fetchBlocks();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* ── CABECERA Y BOTÓN ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-sand-light/10 p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-xl font-serif text-foreground">Bloqueos Activos</h2>
          <p className="text-sm text-muted-foreground mt-1">Cierra tramos horarios específicos de la agenda para descansos o imprevistos.</p>
        </div>
        <Button variant="hero" onClick={openModal} className="gap-2">
          <Plus size={16} /> Añadir Bloqueo
        </Button>
      </div>

      {/* ── LISTA DE BLOQUEOS ── */}
      <div>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Cargando...</p>
        ) : blocks.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-xl bg-card/50">
            <Lock size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-base font-medium text-foreground">Agenda despejada</p>
            <p className="text-sm text-muted-foreground mt-1">No hay horas bloqueadas actualmente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {blocks.map(block => (
              <div key={block.id} className="flex items-start justify-between p-5 bg-card border border-border rounded-xl shadow-sm group">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-sand-light/30 text-sand-dark rounded-lg mt-0.5">
                    <Lock size={18} />
                  </div>
                  <div>
                    <p className="text-base font-serif text-foreground capitalize">
                      {new Date(block.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-foreground">{block.start_time} — {block.end_time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 bg-muted/50 px-2 py-1 rounded inline-block">
                      {block.client_name}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(block.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Eliminar bloqueo">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL DE CREACIÓN DE BLOQUEO ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border flex justify-between items-center bg-sand-light/10">
              <h3 className="font-serif text-lg text-foreground flex items-center gap-2">
                <Lock size={18} className="text-sand-dark" />
                Bloquear Horario
              </h3>
            </div>
            
            <div className="p-5">
              {!showWarning ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest-plus text-muted-foreground mb-1 block">Fecha a bloquear</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-md p-2.5 text-sm focus:ring-sand-dark focus:border-sand-dark bg-background" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest-plus text-muted-foreground mb-1 block">Hora Inicio</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border rounded-md p-2.5 text-sm focus:ring-sand-dark focus:border-sand-dark bg-background" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest-plus text-muted-foreground mb-1 block">Hora Fin</label>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border rounded-md p-2.5 text-sm focus:ring-sand-dark focus:border-sand-dark bg-background" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest-plus text-muted-foreground mb-1 block">Motivo (Opcional)</label>
                    <input type="text" placeholder="Ej: Cita médica, Comer..." value={reason} onChange={e => setReason(e.target.value)} className="w-full border rounded-md p-2.5 text-sm focus:ring-sand-dark focus:border-sand-dark bg-background" />
                  </div>
                </div>
              ) : (
                /* ALERTA DE COLISIÓN DENTRO DEL MODAL */
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-full text-red-600 shrink-0"><AlertTriangle size={20} /></div>
                    <div>
                      <h3 className="text-red-800 font-medium font-serif text-lg">¡Hay {conflicts.length} cita(s) en ese hueco!</h3>
                      <p className="text-sm text-red-600/80 mt-1">Si bloqueas, deberías avisar a estas personas:</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">
                    {conflicts.map(c => (
                      <div key={c.id} className="bg-white border border-red-100 p-3 rounded-md text-sm flex flex-col gap-1">
                        <div className="font-medium text-foreground flex items-center gap-1.5"><User size={14} /> {c.client_name}</div>
                        <div className="text-muted-foreground flex items-center gap-1.5"><Clock size={14} /> {c.start_time} - {c.end_time || "?"}</div>
                        <a href={`tel:${c.client_phone}`} className="text-blue-600 hover:underline flex items-center gap-1.5"><Phone size={14} /> {c.client_phone}</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/30 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closeModal}>Cancelar</Button>
              {!showWarning ? (
                <Button variant="hero" className="flex-1" onClick={handleCheckAndSave} disabled={isSubmitting}>
                  {isSubmitting ? "Comprobando..." : "Bloquear"}
                </Button>
              ) : (
                <Button variant="destructive" className="flex-1" onClick={executeBlock} disabled={isSubmitting}>
                  {isSubmitting ? "Bloqueando..." : "Forzar Bloqueo"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBlocking;