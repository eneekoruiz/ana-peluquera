import { useState, useEffect } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { CalendarDays, Lock, Image, FileText, Power, AlertTriangle, CalendarOff, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSettings, useUpdateAdminSettings } from "@/hooks/useAdminSettings";
import AdminAppointments from "@/components/admin/AdminAppointments";
import AdminBlocking from "@/components/admin/AdminBlocking";
import AdminGallery from "@/components/admin/AdminGallery";
import AdminAudit from "@/components/admin/AdminAudit";
import AdminServices from "@/components/admin/AdminServices";
import AdminVacation from "@/components/admin/AdminVacation";

type AdminTab = "appointments" | "blocking" | "gallery" | "services" | "audit";

const tabs = [
  { key: "appointments" as AdminTab, label: "Citas", icon: CalendarDays },
  { key: "blocking" as AdminTab, label: "Bloqueos", icon: Lock },
  { key: "gallery" as AdminTab, label: "Galería", icon: Image },
  { key: "services" as AdminTab, label: "Servicios", icon: Settings },
  { key: "audit" as AdminTab, label: "Registro", icon: FileText },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("appointments");
  const [showVacation, setShowVacation] = useState(false);
  const { data: settings } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();

  const bookingsEnabled = settings?.bookings_enabled ?? true;
  const todayClosed = settings?.today_closed ?? false;
  const todayClosedDate = settings?.today_closed_date;

  // Reset today_closed if date changed
  const todayStr = new Date().toISOString().slice(0, 10);
  const isTodayActuallyClosed = todayClosed && todayClosedDate === todayStr;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/portal-reservado";
  };

  const toggleMasterSwitch = () => {
    const next = !bookingsEnabled;
    updateSettings.mutate({ bookings_enabled: next });
    toast[next ? "success" : "error"](next ? "Reservas online activadas" : "Reservas online desactivadas");
  };

  const handlePanicButton = () => {
    updateSettings.mutate({ today_closed: true, today_closed_date: todayStr });
    toast.error("Día de hoy cerrado — no se aceptarán más citas");
  };

  return (
    <main className="pt-16">
      <section className="py-6 md:py-12">
        <div className="container">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-1">
              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl text-foreground" style={{ lineHeight: "1.1" }}>
                Panel de Control
              </h1>
              <button
                onClick={handleLogout}
                className="text-xs font-sans uppercase tracking-wide text-muted-foreground hover:text-destructive transition-colors active:scale-95"
              >
                Cerrar sesión
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Hola Ana — AG Beauty Salon
            </p>
          </ScrollReveal>

          {/* Quick controls */}
          <ScrollReveal delay={100}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 sm:mb-8">
              <button
                onClick={toggleMasterSwitch}
                className={`flex items-center gap-3 p-4 rounded-lg transition-all duration-200 active:scale-[0.98] ${
                  bookingsEnabled
                    ? "bg-green-50 text-green-700 shadow-sm"
                    : "bg-destructive/10 text-destructive shadow-sm"
                }`}
              >
                <Power size={18} />
                <div className="text-left">
                  <span className="block text-xs font-sans uppercase tracking-wide font-medium">Reservas Online</span>
                  <span className="text-[10px]">{bookingsEnabled ? "Activadas" : "Desactivadas"}</span>
                </div>
              </button>

              <button
                onClick={handlePanicButton}
                disabled={isTodayActuallyClosed}
                className={`flex items-center gap-3 p-4 rounded-lg transition-all duration-200 active:scale-[0.98] ${
                  isTodayActuallyClosed
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-card text-foreground shadow-sm hover:shadow-md"
                }`}
              >
                <AlertTriangle size={18} className={isTodayActuallyClosed ? "text-muted-foreground" : "text-sand-dark"} />
                <div className="text-left">
                  <span className="block text-xs font-sans uppercase tracking-wide font-medium">
                    {isTodayActuallyClosed ? "Hoy Cerrado" : "Cerrar Hoy"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Botón de pánico</span>
                </div>
              </button>

              <button
                onClick={() => setShowVacation(!showVacation)}
                className="flex items-center gap-3 p-4 rounded-lg bg-card text-foreground shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                <CalendarOff size={18} className="text-sand-dark" />
                <div className="text-left">
                  <span className="block text-xs font-sans uppercase tracking-wide font-medium">Vacaciones</span>
                  <span className="text-[10px] text-muted-foreground">
                    {settings?.vacation_start
                      ? `${settings.vacation_start} → ${settings.vacation_end}`
                      : "Bloquear rango de fechas"}
                  </span>
                </div>
              </button>
            </div>
          </ScrollReveal>

          {showVacation && <AdminVacation settings={settings} onClose={() => setShowVacation(false)} />}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 sm:mb-8 bg-secondary rounded-lg p-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 sm:gap-2 shrink-0 justify-center py-2.5 px-2.5 sm:px-3 text-[10px] sm:text-xs font-sans uppercase tracking-wide rounded-md transition-all duration-200 active:scale-95 ${
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "appointments" && <AdminAppointments />}
          {activeTab === "blocking" && <AdminBlocking />}
          {activeTab === "gallery" && <AdminGallery />}
          {activeTab === "services" && <AdminServices />}
          {activeTab === "audit" && <AdminAudit />}
        </div>
      </section>
    </main>
  );
};

export default AdminDashboard;
