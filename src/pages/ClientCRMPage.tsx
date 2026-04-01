/**
 * @fileoverview ClientCRMPage.tsx — CRM de clientes del salón.
 * Ruta protegida: `/portal-reservado/clientes`
 */

import { useState, useMemo, useEffect } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import {
  Search, User, Phone, Mail, Calendar, FileText,
  ChevronRight, StickyNote, Save, Loader2, Clock, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 🔥 Firebase direct connections
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, setDoc, getDoc, writeBatch, where } from "firebase/firestore";
import { useServices, getLocalizedLabel } from "@/hooks/useServices";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ClientSummary {
  phone: string;
  name: string;
  email?: string;
  totalBookings: number;
  confirmedBookings: number;
  lastVisit: string;
  bookings: any[]; // Guardamos el historial completo aquí
}

// ─── Sub-componente: Panel de detalle de cliente ─────────────────────────────

interface ClientDetailProps {
  client: ClientSummary;
  onClose: () => void;
  onClientDeleted: () => void;
}

const ClientDetail = ({ client, onClose, onClientDeleted }: ClientDetailProps) => {
  const { data: services = [] } = useServices(true);
  const [noteContent, setNoteContent] = useState("");
  const [noteDirty, setNoteDirty] = useState(false);
  const [loadingNote, setLoadingNote] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cargar la nota privada de este cliente desde Firebase
  useEffect(() => {
    const fetchNote = async () => {
      setLoadingNote(true);
      try {
        const noteRef = doc(db, "client_notes", client.phone);
        const noteSnap = await getDoc(noteRef);
        if (noteSnap.exists()) {
          setNoteContent(noteSnap.data().content || "");
          setNoteDirty(false);
        } else {
          setNoteContent("");
          setNoteDirty(false);
        }
      } catch (error) {
        console.error("Error al cargar nota:", error);
      } finally {
        setLoadingNote(false);
      }
    };
    fetchNote();
  }, [client.phone]);

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return "—";
    const svc = services.find((s) => s.id === serviceId);
    return svc ? getLocalizedLabel(svc, "es") : "—";
  };

  const handleNoteChange = (val: string) => {
    setNoteContent(val);
    setNoteDirty(true);
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const noteRef = doc(db, "client_notes", client.phone);
      await setDoc(noteRef, { content: noteContent, updatedAt: new Date().toISOString() }, { merge: true });
      setNoteDirty(false);
      toast.success("Nota privada guardada");
    } catch (error) {
      toast.error("Error al guardar la nota");
    } finally {
      setSavingNote(false);
    }
  };

  // 🔥 LÓGICA RGPD: DERECHO AL OLVIDO
  const handleDeleteClient = async () => {
    if (!window.confirm(`¿Estás segura de que quieres borrar TODOS los datos de ${client.name}? Esta acción elimina sus citas pasadas, futuras y sus notas, y no se puede deshacer.`)) return;
    
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Borrar todas sus citas
      const q = query(collection(db, "bookings"), where("client_phone", "==", client.phone));
      const snap = await getDocs(q);
      snap.docs.forEach(d => batch.delete(d.ref));
      
      // 2. Borrar su nota privada
      const noteRef = doc(db, "client_notes", client.phone);
      batch.delete(noteRef);
      
      // Ejecutar el borrado masivo
      await batch.commit();
      
      toast.success("Cliente eliminado permanentemente");
      onClientDeleted(); // Avisamos al padre para que refresque la lista
    } catch (error) {
      toast.error("Error al eliminar los datos");
      setIsDeleting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const formatTime = (timeStr: string) => timeStr?.slice(0, 5) || "—";

  const statusColors: Record<string, string> = {
    confirmed: "bg-green-50 text-green-700 border-green-200",
    pending:   "bg-sand-light text-sand-dark border-sand-dark/20",
    cancelled: "bg-red-50 text-red-600 border-red-200",
  };
  const statusLabels: Record<string, string> = {
    confirmed: "Confirmada",
    pending:   "Pendiente",
    cancelled: "Cancelada",
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4">
      {/* Cabecera del cliente */}
      <div className="p-6 border-b border-border bg-card relative">
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
          ← Volver
        </button>

        {/* Botón Derecho al Olvido */}
        <Button variant="ghost" size="icon" disabled={isDeleting} onClick={handleDeleteClient} className="absolute top-4 right-4 text-red-400 hover:text-red-600 hover:bg-red-50" title="Eliminar todos los datos del cliente">
          <Trash2 size={18} />
        </Button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-sand-light flex items-center justify-center shrink-0">
            <User size={20} className="text-sand-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-lg text-foreground">{client.name}</h2>
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone size={10} /> {client.phone}
              </span>
              {client.email && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail size={10} /> {client.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            { label: "Total citas", value: client.totalBookings },
            { label: "Confirmadas", value: client.confirmedBookings },
            { label: "Última visita", value: client.lastVisit ? new Date(client.lastVisit).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-background rounded-lg p-3 text-center border border-border/50">
              <p className="font-serif text-lg text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cuerpo desplazable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ── Notas privadas ── */}
        <div>
          <h3 className="text-[10px] font-sans uppercase tracking-widest-plus text-sand-dark mb-3 flex items-center gap-1.5">
            <StickyNote size={11} /> Notas privadas (Solo Ana)
          </h3>
          {loadingNote ? (
            <div className="h-24 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <textarea
                value={noteContent}
                onChange={(e) => handleNoteChange(e.target.value)}
                rows={4}
                placeholder="Anotaciones sobre alergias, historial de tintes, preferencias..."
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-sand-dark resize-none leading-relaxed"
              />
              {noteDirty && (
                <Button size="sm" onClick={handleSaveNote} disabled={savingNote} className="mt-2 gap-1.5 h-8 text-xs bg-charcoal text-cream hover:bg-charcoal/90">
                  {savingNote ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Guardar nota
                </Button>
              )}
            </>
          )}
        </div>

        {/* ── Historial de citas ── */}
        <div>
          <h3 className="text-[10px] font-sans uppercase tracking-widest-plus text-sand-dark mb-3 flex items-center gap-1.5">
            <Calendar size={11} /> Historial de citas ({client.bookings.length})
          </h3>
          {client.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-xl">Sin historial</p>
          ) : (
            <div className="space-y-2">
              {client.bookings.map((booking: any) => (
                <div key={booking.id} className="bg-background rounded-lg p-3.5 border border-border flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <Calendar size={13} className="text-sand-dark mb-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {getServiceName(booking.service_id)}
                      </p>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border shrink-0", statusColors[booking.status] || statusColors.pending)}>
                        {statusLabels[booking.status] || booking.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{formatDate(booking.date)}</span>
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Clock size={9} /> {formatTime(booking.start_time)}
                        </span>
                      </div>
                      <span className="text-[10px] font-sans uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {booking.employee_id === "ana_id" || booking.employee_id === "ana" ? "Ana" : "Refuerzo"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────

const ClientCRMPage = () => {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  const fetchClientsFromBookings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"));
      const snap = await getDocs(q);
      const allBookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const clientMap: Record<string, ClientSummary> = {};

      allBookings.forEach((b: any) => {
        // Ignoramos los bloqueos de agenda y citas sin teléfono
        if (!b.client_phone || b.type === 'block') return;

        if (!clientMap[b.client_phone]) {
          clientMap[b.client_phone] = {
            phone: b.client_phone,
            name: b.client_name,
            email: b.client_email,
            totalBookings: 0,
            confirmedBookings: 0,
            lastVisit: b.date,
            bookings: []
          };
        }

        const client = clientMap[b.client_phone];
        client.totalBookings += 1;
        if (b.status === "confirmed") client.confirmedBookings += 1;
        client.bookings.push(b);
        
        if (new Date(b.date) > new Date(client.lastVisit)) {
          client.lastVisit = b.date;
        }
      });

      // Ordenar clientes alfabéticamente y sus citas de más reciente a más antigua
      const clientList = Object.values(clientMap).sort((a, b) => a.name.localeCompare(b.name));
      clientList.forEach(c => {
        c.bookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });

      setClients(clientList);
    } catch (error) {
      toast.error("Error al cargar los clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientsFromBookings();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const selectedClient = clients.find((c) => c.phone === selectedPhone);

  const handleClientDeleted = () => {
    setSelectedPhone(null);
    fetchClientsFromBookings(); // Recargamos la lista
  };

  return (
    <main className="pt-16 min-h-screen bg-warm-white">
      <section className="py-6 md:py-10">
        <div className="container">
          <ScrollReveal>
            <div className="mb-6">
              <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-1">Clientes</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest-plus">Historial y notas privadas</p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[70vh]">
            
            {/* ── Lista de clientes (Izquierda) ── */}
            <div className="md:col-span-1">
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o teléfono…"
                  className="w-full h-10 pl-9 pr-4 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-sand-dark"
                />
              </div>

              <p className="text-[10px] text-muted-foreground uppercase tracking-widest-plus mb-3">
                {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
              </p>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-1.5 overflow-y-auto max-h-[65vh] pr-1">
                  {filtered.map((client) => (
                    <button
                      key={client.phone} type="button" onClick={() => setSelectedPhone(client.phone)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all",
                        selectedPhone === client.phone ? "bg-charcoal text-cream border-charcoal" : "bg-card border-border/50 hover:border-sand-dark/40 hover:shadow-sm"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-serif",
                        selectedPhone === client.phone ? "bg-white/20 text-cream" : "bg-sand-light/50 text-sand-dark"
                      )}>
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{client.name}</p>
                        <p className={cn("text-xs truncate", selectedPhone === client.phone ? "text-cream/70" : "text-muted-foreground")}>
                          {client.phone} · {client.totalBookings} citas
                        </p>
                      </div>
                      <ChevronRight size={14} className="shrink-0 opacity-40" />
                    </button>
                  ))}

                  {filtered.length === 0 && (
                    <div className="text-center py-12 border border-dashed rounded-xl">
                      <User size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">Sin resultados</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Detalle del cliente (Derecha) ── */}
            <div className="md:col-span-2 bg-background rounded-xl border border-border overflow-hidden shadow-sm">
              {selectedClient ? (
                <ClientDetail client={selectedClient} onClose={() => setSelectedPhone(null)} onClientDeleted={handleClientDeleted} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 p-12">
                  <FileText size={40} className="opacity-20" />
                  <p className="text-sm">Selecciona un cliente para ver su historial y notas</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>
    </main>
  );
};

export default ClientCRMPage;