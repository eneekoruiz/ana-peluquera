import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import {
  CalendarDays, Lock, Power, AlertTriangle,
  CalendarOff, Users, Plus, Trash2, Save, UserCog, Palmtree, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdminSettings, useUpdateAdminSettings } from "@/hooks/useAdminSettings";
import { useAuth } from "@/contexts/AuthContext";
import AdminAppointments from "@/components/admin/AdminAppointments";
import AdminBlocking from "@/components/admin/AdminBlocking";

type AdminTab = "appointments" | "staff" | "blocking";

const tabs: { key: AdminTab; label: string; icon: React.ElementType }[] = [
  { key: "appointments", label: "Citas", icon: CalendarDays },
  { key: "staff",        label: "Personal", icon: UserCog },
  { key: "blocking",     label: "Bloqueos", icon: Lock },
];

const getLocalDateStr = (d = new Date()) => {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// ── COMPONENTE VACACIONES GENERALES (SALÓN) ──
const VacationManager = ({ settings, onClose }: { settings: any, onClose: () => void }) => {
  const updateSettings = useUpdateAdminSettings();
  const [ranges, setRanges] = useState<{start: string, end: string}[]>(settings?.vacation_ranges || []);

  const handleAdd = () => {
    if (ranges.some(r => !r.start || !r.end)) {
      toast.error("Completa los rangos actuales primero");
      return;
    }
    setRanges([...ranges, { start: "", end: "" }]);
  };
  
  const handleRemove = (index: number) => setRanges(ranges.filter((_, i) => i !== index));
  
  const handleChange = (index: number, field: 'start'|'end', value: string) => {
    const newRanges = [...ranges];
    newRanges[index][field] = value;
    if (field === 'start' && (!newRanges[index].end || newRanges[index].end < value)) {
      newRanges[index].end = value;
    }
    setRanges(newRanges);
  };

  const handleSave = () => {
    let validRanges = ranges.filter(r => r.start && r.end);
    if (validRanges.some(r => r.start > r.end)) {
        toast.error("Error: El inicio es posterior al fin.");
        return;
    }
    updateSettings.mutate({ vacation_ranges: validRanges });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border overflow-hidden">
        <div className="p-5 border-b flex justify-between items-center bg-sand-light/10">
          <h3 className="font-serif text-lg flex items-center gap-2">
            <CalendarOff size={18} className="text-sand-dark" /> Vacaciones Salón
          </h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {ranges.map((range, i) => (
            <div key={i} className="flex items-center gap-2 bg-background p-3 rounded-lg border">
              <div className="flex-1 space-y-2 text-sm">
                <input type="date" value={range.start} onChange={e => handleChange(i, 'start', e.target.value)} className="w-full border rounded p-1" />
                <input type="date" min={range.start} value={range.end} onChange={e => handleChange(i, 'end', e.target.value)} className="w-full border rounded p-1" />
              </div>
              <button onClick={() => handleRemove(i)} className="text-red-500 p-2"><Trash2 size={16} /></button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleAdd} className="w-full border-dashed gap-1">
            <Plus size={14} /> Añadir fecha
          </Button>
        </div>
        <div className="p-4 border-t flex gap-3 bg-muted/30">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button variant="hero" className="flex-1" onClick={handleSave}>Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
};

// ── COMPONENTE GESTOR PERSONAL (STAFF) ──
const AdminStaff = ({ settings, updateSettings }: { settings: any, updateSettings: any }) => {
  const defaultStaff = [
    { id: "ana_id", name: "Ana (Responsable)", skills: ["peluqueria", "masajes"], workingDays: [1, 2, 3, 4, 5, 6], priority: 1, vacations: [] },
    { id: "refuerzo_id", name: "Refuerzo Peluquería", skills: ["peluqueria"], workingDays: [5, 6], priority: 2, vacations: [] }
  ];

  const [staff, setStaff] = useState<any[]>(settings?.staff || defaultStaff);
  const [isDirty, setIsDirty] = useState(false);
  const [editingVacationsIdx, setEditingVacationsIdx] = useState<number | null>(null);

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
          <h2 className="text-xl font-serif text-foreground">Equipo del Salón</h2>
          <p className="text-sm text-muted-foreground mt-1">Días de trabajo y vacaciones personales.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            setStaff([...staff, { id: `emp_${Date.now()}`, name: "Nuevo Empleado", skills: ["peluqueria"], workingDays: [1, 2, 3, 4, 5], priority: staff.length + 1, vacations: [] }]);
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

            <div className="mb-5">
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

            <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => setEditingVacationsIdx(idx)}>
              <Palmtree size={14} className="text-sand-dark" /> 
              Gestionar sus Vacaciones ({emp.vacations?.length || 0})
            </Button>
          </div>
        ))}
      </div>

      {/* ── MODAL VACACIONES INDIVIDUALES ── */}
      {editingVacationsIdx !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-serif text-lg">Vacaciones de {staff[editingVacationsIdx].name}</h3>
              <button onClick={() => setEditingVacationsIdx(null)}><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto">
              {(staff[editingVacationsIdx].vacations || []).map((v: any, vIdx: number) => (
                <div key={vIdx} className="flex gap-2 items-center bg-muted/20 p-2 rounded border">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <input type="date" value={v.start} onChange={(e) => {
                      const newVac = [...staff[editingVacationsIdx].vacations];
                      newVac[vIdx].start = e.target.value;
                      updateStaffMember(editingVacationsIdx, { vacations: newVac });
                    }} className="text-xs p-1 border rounded" />
                    <input type="date" value={v.end} onChange={(e) => {
                      const newVac = [...staff[editingVacationsIdx].vacations];
                      newVac[vIdx].end = e.target.value;
                      updateStaffMember(editingVacationsIdx, { vacations: newVac });
                    }} className="text-xs p-1 border rounded" />
                  </div>
                  <button onClick={() => {
                    const newVac = staff[editingVacationsIdx].vacations.filter((_:any, i:number)=>i!==vIdx);
                    updateStaffMember(editingVacationsIdx, { vacations: newVac });
                  }} className="text-red-500"><Trash2 size={14}/></button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => {
                const newVac = [...(staff[editingVacationsIdx].vacations || []), { start: "", end: "" }];
                updateStaffMember(editingVacationsIdx, { vacations: newVac });
              }}>+ Añadir periodo libre</Button>
            </div>
            <div className="p-4 bg-muted/30 border-t flex justify-end">
              <Button variant="hero" onClick={() => setEditingVacationsIdx(null)}>Aceptar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("appointments");
  const [showVacation, setShowVacation] = useState(false);
  const { data: settings } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const { logout } = useAuth();

  const todayStr = getLocalDateStr();
  const isTodayClosed = settings?.today_closed && settings?.today_closed_date === todayStr;

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
                  <Link to="/portal-reservado/clientes"><Users size={16} /> CRM Clientes</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={async () => { await logout(); window.location.href = "/portal-reservado"; }}>Cerrar sesión</Button>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={60}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
                  <AlertTriangle size={18} /> {isTodayClosed ? "Salón Cerrado Hoy" : "Salón Abierto Hoy"}
                </p>
              </button>

              <button type="button" onClick={() => setShowVacation(true)} className="rounded-xl p-5 border bg-card border-border text-left hover:shadow-md transition-all">
                <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Calendario</p>
                <p className="text-base font-serif text-foreground flex items-center gap-2"><CalendarOff size={18} className="text-sand-dark" /> Festivos y Vacaciones</p>
              </button>
            </div>
          </ScrollReveal>

          {showVacation && <VacationManager settings={settings} onClose={() => setShowVacation(false)} />}

          <ScrollReveal delay={80}>
            <div className="flex gap-2 mb-8 border-b border-border overflow-x-auto">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === key ? "border-sand-dark text-sand-dark bg-sand-light/10" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100} className="min-h-[400px]">
            {activeTab === "appointments" && <AdminAppointments />}
            {activeTab === "staff"        && <AdminStaff settings={settings} updateSettings={updateSettings} />}
            {activeTab === "blocking"     && <AdminBlocking />}
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default AdminDashboard;