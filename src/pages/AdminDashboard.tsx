import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import {
  Power, AlertTriangle, Users, Plus, Trash2, Save, CalendarCheck, Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdminSettings, useUpdateAdminSettings } from "@/hooks/useAdminSettings";
import { useAuth } from "@/contexts/AuthContext";

const getLocalDateStr = (d = new Date()) => {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// ── COMPONENTE GESTOR PERSONAL (STAFF) LIMPIO ──
const AdminStaff = ({ settings, updateSettings }: { settings: any, updateSettings: any }) => {
  const defaultStaff = [
    { id: "ana_id", name: "Ana (Responsable)", skills: ["peluqueria", "masajes"], workingDays: [1, 2, 3, 4, 5, 6], priority: 1 },
    { id: "refuerzo_id", name: "Refuerzo Peluquería", skills: ["peluqueria"], workingDays: [5, 6], priority: 2 }
  ];

  const [staff, setStaff] = useState<any[]>(settings?.staff || defaultStaff);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settings?.staff) setStaff(settings.staff);
  }, [settings?.staff]);

  const daysMap = ["D", "L", "M", "X", "J", "V", "S"];
  const availableSkills = [{ id: "peluqueria", label: "Peluquería" }, { id: "masajes", label: "Masajes" }];

  const updateStaffMember = (idx: number, data: any) => {
    const newStaff = [...staff];
    newStaff[idx] = { ...newStaff[idx], ...data };
    setStaff(newStaff);
    setIsDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate({ staff: staff });
    setIsDirty(false);
    toast.success("Plantilla actualizada");
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-sand-light/10 p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-xl font-serif text-foreground">Equipo y Horario Base</h2>
          <p className="text-sm text-muted-foreground mt-1">Configura los días laborales por defecto (Las vacaciones y bloqueos se gestionan desde tu móvil).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            setStaff([...staff, { id: `emp_${Date.now()}`, name: "Nuevo Empleado", skills: ["peluqueria"], workingDays: [1, 2, 3, 4, 5], priority: staff.length + 1 }]);
            setIsDirty(true);
          }} className="gap-1.5 border-dashed"><Plus size={16} /> Añadir trabajadora</Button>
          {isDirty && <Button variant="hero" size="sm" onClick={handleSave} className="gap-1.5"><Save size={16} /> Guardar cambios</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staff.map((emp, idx) => (
          <div key={emp.id} className="p-6 border border-border bg-card rounded-xl shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-sand-dark"></div>
            
            <div className="flex justify-between items-start mb-4">
              <input type="text" value={emp.name} onChange={(e) => updateStaffMember(idx, { name: e.target.value })}
                className="font-serif text-lg text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-sand-dark focus:outline-none w-full" />
              <button onClick={() => { setStaff(staff.filter((_, i) => i !== idx)); setIsDirty(true); }} className="text-muted-foreground hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            
            <div className="mb-5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest-plus mb-2">Especialidades:</p>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((s) => (
                  <button key={s.id} onClick={() => {
                    const skills = emp.skills.includes(s.id) ? emp.skills.filter((sk:any)=>sk!==s.id) : [...emp.skills, s.id];
                    updateStaffMember(idx, { skills });
                  }} className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-medium border ${emp.skills.includes(s.id) ? 'bg-sand-light/50 text-sand-dark' : 'text-muted-foreground border-border'}`}>{s.label}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest-plus mb-2">Días Laborales:</p>
              <div className="flex gap-1.5">
                {daysMap.map((d, i) => (
                  <button key={i} onClick={() => {
                    const days = emp.workingDays.includes(i) ? emp.workingDays.filter((day:number)=>day!==i) : [...emp.workingDays, i].sort();
                    updateStaffMember(idx, { workingDays: days });
                  }} className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium ${emp.workingDays.includes(i) ? 'bg-charcoal text-cream' : 'bg-muted text-muted-foreground/40'}`}>{d}</button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── COMPONENTE PRINCIPAL (DASHBOARD) ──
const AdminDashboard = () => {
  const { data: settings } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const { logout } = useAuth();
  
  // Parámetros de la URL para detectar la vuelta de Google
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const googleStatus = searchParams.get("google");
    if (googleStatus === "success") {
      toast.success("¡Google Calendar conectado con éxito!");
      setSearchParams({});
    } else if (googleStatus === "error") {
      toast.error("Hubo un problema al conectar con Google.");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const todayStr = getLocalDateStr();
  const isTodayClosed = settings?.today_closed && settings?.today_closed_date === todayStr;
  
  // Tipado seguro para que TypeScript no de error
  const hasGoogleCalendar = !!(settings as any)?.googleCalendarTokens;

  // Redirección al backend para el OAuth
  const handleConnectGoogle = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  return (
    <main className="pt-16 min-h-screen bg-warm-white">
      <section className="py-6 md:py-12">
        <div className="container">
          
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-border pb-6">
              <div>
                <h1 className="font-serif text-3xl md:text-4xl text-foreground">Panel de Ana</h1>
                <p className="text-xs text-muted-foreground uppercase tracking-widest-plus mt-1">AG Beauty Salon · Centro de Mando</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="hero" size="sm" className="gap-2 h-10 px-4" asChild>
                  <Link to="/portal-reservado/clientes"><Users size={16} /> Fichas de Clientes</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={async () => { await logout(); window.location.href = "/portal-reservado"; }}>Cerrar sesión</Button>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={60}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              
              <div className={`rounded-xl p-5 border flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${settings?.bookings_enabled !== false ? "bg-card border-border" : "bg-red-50 border-red-200"}`}
                onClick={() => updateSettings.mutate({ bookings_enabled: !settings?.bookings_enabled })}>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Estado de la Web</p>
                  <p className={`text-base font-serif ${settings?.bookings_enabled !== false ? "text-green-700" : "text-red-600"}`}>
                    {settings?.bookings_enabled !== false ? "Reservas Abiertas" : "Reservas Pausadas"}
                  </p>
                </div>
                <Power size={24} className={settings?.bookings_enabled !== false ? "text-green-600" : "text-red-500"} />
              </div>

              <button type="button" onClick={() => {
                if (isTodayClosed) updateSettings.mutate({ today_closed: false, today_closed_date: null });
                else updateSettings.mutate({ today_closed: true, today_closed_date: todayStr });
              }} className={`rounded-xl p-5 border text-left transition-all hover:shadow-md ${isTodayClosed ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
                <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Apertura Diaria</p>
                <p className={`text-base font-serif flex items-center gap-2 ${isTodayClosed ? "text-red-600" : "text-green-700"}`}>
                  <AlertTriangle size={18} /> {isTodayClosed ? "Cerrado por Urgencia" : "Salón Abierto Hoy"}
                </p>
              </button>

              <button 
                type="button" 
                onClick={handleConnectGoogle} 
                className={`rounded-xl p-5 border text-left hover:shadow-md transition-all ${hasGoogleCalendar ? "bg-blue-50/50 border-blue-200" : "bg-card border-border"}`}
              >
                <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Sincronización</p>
                <p className={`text-base font-serif flex items-center gap-2 ${hasGoogleCalendar ? "text-blue-700" : "text-foreground"}`}>
                  <CalendarCheck size={18} className={hasGoogleCalendar ? "text-blue-600" : "text-muted-foreground"} /> 
                  {hasGoogleCalendar ? "Google Conectado" : "Vincular Google"}
                </p>
                {!hasGoogleCalendar && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">Conecta para sincronizar</p>
                )}
              </button>

              {/* TARJETA INFORMATIVA: Reemplaza a las antiguas vacaciones */}
              <div className="rounded-xl p-5 border bg-amber-50/50 border-amber-200 text-left">
                <p className="text-[10px] text-amber-700 uppercase mb-1.5 font-bold">Gestión de Citas</p>
                <p className="text-sm font-sans text-amber-900 flex items-start gap-2 leading-tight">
                  <Smartphone size={18} className="shrink-0 mt-0.5" /> 
                  Abre Google Calendar en tu móvil para ver, crear o borrar reservas y vacaciones.
                </p>
              </div>

            </div>
          </ScrollReveal>

          <ScrollReveal delay={100} className="min-h-[400px]">
            <AdminStaff settings={settings} updateSettings={updateSettings} />
          </ScrollReveal>
          
        </div>
      </section>
    </main>
  );
};

export default AdminDashboard;