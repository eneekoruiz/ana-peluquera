import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import {
  Power, AlertTriangle, Plus, Trash2, Save, CalendarCheck, Smartphone, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdminSettings, useUpdateAdminSettings } from "@/hooks/useAdminSettings";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGoogleOAuthUrl,
  useCalendarWatchStatus,
  useRegisterCalendarWatch,
  useCalendarHealth,
} from "@/hooks/useCalendarWatch";


const getLocalDateStr = (d = new Date()) => {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// --- INTERFACES ---
interface WorkDay {
  dayId: number; // 0=Dom, 1=Lun...
  isActive: boolean;
  isSplit?: boolean; 
  morningStart: string; 
  morningEnd: string;   
  afternoonStart: string; 
  afternoonEnd: string;   
}

interface Employee {
  id: string;
  name: string;
  skills: string[];
  priority: number;
  schedule: WorkDay[]; 
}

const DEFAULT_SCHEDULE: WorkDay[] = [
  { dayId: 1, isActive: true, isSplit: true, morningStart: "09:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00" }, // Lun
  { dayId: 2, isActive: true, isSplit: true, morningStart: "09:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00" }, // Mar
  { dayId: 3, isActive: true, isSplit: true, morningStart: "09:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00" }, // Mié
  { dayId: 4, isActive: true, isSplit: true, morningStart: "09:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00" }, // Jue
  { dayId: 5, isActive: true, isSplit: true, morningStart: "09:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00" }, // Vie
  { dayId: 6, isActive: true, isSplit: false, morningStart: "09:00", morningEnd: "14:00", afternoonStart: "", afternoonEnd: "" }, // Sáb
  { dayId: 0, isActive: false, isSplit: false, morningStart: "", morningEnd: "", afternoonStart: "", afternoonEnd: "" }, // Dom
];

// ── COMPONENTE GESTOR PERSONAL AVANZADO ──
const AdminStaff = ({ settings, updateSettings }: { settings: any, updateSettings: any }) => {
  const defaultStaff: Employee[] = [
    { id: "ana_id", name: "Ana (Responsable)", skills: ["peluqueria", "masajes"], priority: 1, schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)) },
  ];

  const [staff, setStaff] = useState<Employee[]>(settings?.staff || defaultStaff);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Migración automática
    if (settings?.staff) {
      const migratedStaff = settings.staff.map((emp: any) => {
        if (!emp.schedule) {
           return { ...emp, schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)) };
        }
        const updatedSchedule = emp.schedule.map((d: any) => ({
          ...d,
          isSplit: d.isSplit !== undefined ? d.isSplit : (d.afternoonStart && d.afternoonEnd ? true : false)
        }));
        return { ...emp, schedule: updatedSchedule };
      });
      setStaff(migratedStaff);
    }
  }, [settings?.staff]);

  const daysLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const availableSkills = [{ id: "peluqueria", label: "Peluquería" }, { id: "masajes", label: "Masajes" }];

  const updateStaffMember = (idx: number, data: Partial<Employee>) => {
    const newStaff = [...staff];
    newStaff[idx] = { ...newStaff[idx], ...data };
    setStaff(newStaff);
    setIsDirty(true);
  };

  const updateSchedule = (empIdx: number, dayId: number, data: Partial<WorkDay>) => {
    const newStaff = [...staff];
    const scheduleIndex = newStaff[empIdx].schedule.findIndex(d => d.dayId === dayId);
    
    if (scheduleIndex !== -1) {
      newStaff[empIdx].schedule[scheduleIndex] = { ...newStaff[empIdx].schedule[scheduleIndex], ...data };
    } else {
      const newDay = { ...DEFAULT_SCHEDULE.find(d => d.dayId === dayId)!, ...data };
      newStaff[empIdx].schedule.push(newDay);
    }
    setStaff(newStaff);
    setIsDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate({ staff: staff });
    setIsDirty(false);
    toast.success("Plantilla y horarios actualizados");
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-sand-light/10 p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-xl font-serif text-foreground">Equipo y Horario Base</h2>
          <p className="text-sm text-muted-foreground mt-1">Configura los turnos de trabajo por defecto. (Las vacaciones puntuales van por Google Calendar).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            setStaff([...staff, { id: `emp_${Date.now()}`, name: "Nuevo Empleado", skills: ["peluqueria"], priority: staff.length + 1, schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)) }]);
            setIsDirty(true);
          }} className="gap-1.5 border-dashed"><Plus size={16} /> Añadir profesional</Button>
          {isDirty && <Button variant="hero" size="sm" onClick={handleSave} className="gap-1.5"><Save size={16} /> Guardar cambios</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {staff.map((emp, empIdx) => (
          <div key={emp.id} className="p-6 border border-border bg-card rounded-xl shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-sand-dark"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1 mr-4">
                 <input type="text" value={emp.name} onChange={(e) => updateStaffMember(empIdx, { name: e.target.value })}
                 className="font-serif text-xl text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-sand-dark focus:outline-none w-full pb-1" placeholder="Nombre..." />
              </div>
              <button onClick={() => { setStaff(staff.filter((_, i) => i !== empIdx)); setIsDirty(true); }} className="text-muted-foreground hover:text-red-500 bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
            </div>
            
            <div className="mb-6">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest-plus mb-3">Especialidades:</p>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((s) => (
                  <button key={s.id} onClick={() => {
                    const skills = emp.skills.includes(s.id) ? emp.skills.filter((sk:string)=>sk!==s.id) : [...emp.skills, s.id];
                    updateStaffMember(empIdx, { skills });
                  }} className={`px-3 py-1.5 rounded-md text-[11px] uppercase font-medium border transition-colors ${emp.skills.includes(s.id) ? 'bg-sand-light/50 text-sand-dark border-sand-dark/30' : 'text-muted-foreground border-border hover:bg-muted'}`}>{s.label}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest-plus mb-3 flex items-center gap-1.5"><Clock size={12}/> Horario Semanal:</p>
              <div className="space-y-2 border border-border rounded-lg p-1 bg-background/50">
                {[1, 2, 3, 4, 5, 6, 0].map((dayId) => {
                  const dayData = emp.schedule.find(d => d.dayId === dayId) || { dayId, isActive: false, isSplit: false, morningStart: "", morningEnd: "", afternoonStart: "", afternoonEnd: "" };
                  
                  return (
                    <div key={dayId} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-2.5 rounded-md transition-colors ${dayData.isActive ? 'bg-card shadow-sm border border-border/50' : 'opacity-60'}`}>
                      
                      <div className="flex items-center gap-3 w-28 shrink-0">
                         <input type="checkbox" checked={dayData.isActive} onChange={(e) => updateSchedule(empIdx, dayId, { isActive: e.target.checked })}
                         className="w-4 h-4 rounded border-border text-sand-dark focus:ring-ring cursor-pointer" />
                         <span className={`text-sm font-medium ${dayData.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{daysLabels[dayId]}</span>
                      </div>

                      {dayData.isActive ? (
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                          
                          {/* BOTÓN ALTERNADOR PARTIDO/CONTINUO */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextIsSplit = !dayData.isSplit;
                              updateSchedule(empIdx, dayId, {
                                isSplit: nextIsSplit,
                                ...(!nextIsSplit ? { afternoonStart: "", afternoonEnd: "" } : {})
                              });
                            }}
                            className={`text-[10px] px-2 py-1.5 rounded uppercase tracking-wider font-medium transition-colors cursor-pointer w-[75px] shrink-0 text-center mr-1 ${
                              dayData.isSplit
                                ? 'bg-amber-100/50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            {dayData.isSplit ? "Partido" : "Continuo"}
                          </button>

                          <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded border border-border/50">
                            <input type="time" value={dayData.morningStart} onChange={(e) => updateSchedule(empIdx, dayId, { morningStart: e.target.value })} className="text-xs bg-transparent border-none focus:ring-0 p-0 w-16" />
                            <span className="text-xs text-muted-foreground">-</span>
                            <input type="time" value={dayData.morningEnd} onChange={(e) => updateSchedule(empIdx, dayId, { morningEnd: e.target.value })} className="text-xs bg-transparent border-none focus:ring-0 p-0 w-16" />
                          </div>
                          
                          {dayData.isSplit && (
                            <>
                              <span className="text-xs text-muted-foreground hidden sm:inline">y</span>
                              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded border border-border/50">
                                <input type="time" value={dayData.afternoonStart} onChange={(e) => updateSchedule(empIdx, dayId, { afternoonStart: e.target.value })} className="text-xs bg-transparent border-none focus:ring-0 p-0 w-16" />
                                <span className="text-xs text-muted-foreground">-</span>
                                <input type="time" value={dayData.afternoonEnd} onChange={(e) => updateSchedule(empIdx, dayId, { afternoonEnd: e.target.value })} className="text-xs bg-transparent border-none focus:ring-0 p-0 w-16" />
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic flex-1">Día libre</span>
                      )}
                    </div>
                  );
                })}
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
  const { data: watchStatus, isFetching: watchStatusLoading, refetch: refetchWatchStatus } = useCalendarWatchStatus();
  const { data: calendarHealth, isLoading: healthLoading } = useCalendarHealth();
  const registerWatch = useRegisterCalendarWatch();

  
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const googleStatus = searchParams.get("google");
    const googleSyncStatus = searchParams.get("google_sync");

    if (googleStatus === "success" || googleSyncStatus === "success") {
      toast.success("Google Calendar conectado. Activa ahora el webhook para sincronización en tiempo real.");
      void refetchWatchStatus();
      setSearchParams({});
    } else if (googleStatus === "error" || googleSyncStatus === "error") {
      toast.error("Hubo un problema al conectar con Google.");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, refetchWatchStatus]);

  const todayStr = getLocalDateStr();
  const isTodayClosed = settings?.today_closed && settings?.today_closed_date === todayStr;
  
  const hasGoogleOAuth = !!watchStatus?.googleLinked;
  const hasActiveWatch = !!watchStatus?.configured;
  const watchExpiration = watchStatus?.expiration
    ? new Date(watchStatus.expiration).toLocaleString("es-ES")
    : null;

  const handleConnectGoogle = () => {
    window.location.href = getGoogleOAuthUrl();
  };

  const handleEnableWatch = async () => {
    try {
      await registerWatch.mutateAsync();
      await refetchWatchStatus();
    } catch {
      // El toast de error ya se gestiona en el hook.
    }
  };

  return (
    <main className="pt-16 min-h-screen bg-warm-white">
      <section className="py-6 md:py-12">
        <div className="container max-w-6xl">
          
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-border pb-6">
              <div>
                <h1 className="font-serif text-3xl md:text-4xl text-foreground">Panel de Ana</h1>
                <p className="text-xs text-muted-foreground uppercase tracking-widest-plus mt-1">AG Beauty Salon · Centro de Mando</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={async () => { await logout(); window.location.href = "/portal-reservado"; }}>Cerrar sesión</Button>
              </div>
            </div>
          </ScrollReveal>

          {/* Estado del Sistema */}
          <ScrollReveal delay={30}>
            <div className="bg-gradient-to-r from-sand-light/20 to-cream/30 rounded-xl p-6 mb-8 border border-sand-light/30">
              <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                <Smartphone size={20} />
                Estado del Sistema
              </h2>
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-5 border border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-border/50">
                  <div className="flex flex-col md:items-center pt-2 md:pt-0">
                    <span className="text-muted-foreground text-sm mb-1">Reservas Web:</span>
                    <span className={`font-semibold text-lg ${settings?.bookings_enabled !== false ? 'text-green-600' : 'text-red-600'}`}>
                      {settings?.bookings_enabled !== false ? 'Activas' : 'Pausadas'}
                    </span>
                  </div>
                  <div className="flex flex-col md:items-center pt-4 md:pt-0">
                    <span className="text-muted-foreground text-sm mb-1">Permisos de Google:</span>
                    <span className={`font-semibold text-lg ${hasGoogleOAuth ? 'text-blue-600' : 'text-orange-600'}`}>
                      {hasGoogleOAuth ? 'Vinculado' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="flex flex-col md:items-center pt-4 md:pt-0">
                    <span className="text-muted-foreground text-sm mb-1">Estado de la Sincronización:</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full animate-pulse ${calendarHealth?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={`font-semibold text-lg ${calendarHealth?.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                        {healthLoading ? 'Verificando...' : (calendarHealth?.status === 'connected' ? 'Conectado y Operativo' : 'DESCONECTADO')}
                      </span>
                    </div>
                    {calendarHealth?.status === 'disconnected' && (
                      <p className="text-[10px] text-red-500 mt-1 font-bold animate-bounce">⚠️ RECONEXIÓN REQUERIDA</p>
                    )}
                  </div>
                </div>
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
                className={`rounded-xl p-5 border text-left hover:shadow-md transition-all ${hasGoogleOAuth ? "bg-blue-50/50 border-blue-200" : "bg-card border-border"}`}
              >
                <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Sincronización</p>
                <p className={`text-base font-serif flex items-center gap-2 ${hasGoogleOAuth ? "text-blue-700" : "text-foreground"}`}>
                  <CalendarCheck size={18} className={hasGoogleOAuth ? "text-blue-600" : "text-muted-foreground"} /> 
                  {hasGoogleOAuth ? "Google Conectado" : "Vincular Google"}
                </p>
                {!hasGoogleOAuth && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">Conecta para sincronizar</p>
                )}
              </button>

              <div className="rounded-xl p-5 border bg-amber-50/50 border-amber-200 text-left">
                <p className="text-[10px] text-amber-700 uppercase mb-1.5 font-bold">Gestión de Citas</p>
                <p className="text-sm font-sans text-amber-900 flex items-start gap-2 leading-tight">
                  <Smartphone size={18} className="shrink-0 mt-0.5" /> 
                  Usa tu Google Calendar del móvil para ver, crear o borrar reservas.
                </p>
              </div>

              <div className="rounded-xl p-5 border bg-card border-border text-left sm:col-span-2 lg:col-span-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Webhook Google Calendar</p>
                    <p className={`text-base font-serif ${hasActiveWatch ? "text-green-700" : "text-foreground"}`}>
                      {hasActiveWatch ? "Sincronización Total Activa" : "Sincronización Manual Requerida"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hasActiveWatch
                        ? `Todo funciona automáticamente. Expira: ${watchExpiration || "sin fecha"}`
                        : "El sistema intentará conectarse solo al vincular Google, pero puedes activarlo aquí si falla."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConnectGoogle}
                    >
                      {hasGoogleOAuth ? "Reconectar Google" : "Conectar Google"}
                    </Button>

                    <Button
                      variant="hero"
                      size="sm"
                      onClick={handleEnableWatch}
                      disabled={!hasGoogleOAuth || registerWatch.isPending || watchStatusLoading}
                    >
                      {registerWatch.isPending
                        ? "Activando..."
                        : hasActiveWatch
                          ? "Renovar webhook"
                          : "Activar webhook"}
                    </Button>
                  </div>
                </div>
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