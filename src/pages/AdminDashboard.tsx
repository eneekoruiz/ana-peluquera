import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { Package, CalendarDays, Lock, Image, FileText } from "lucide-react";
import AdminInventory from "@/components/admin/AdminInventory";
import AdminAppointments from "@/components/admin/AdminAppointments";
import AdminBlocking from "@/components/admin/AdminBlocking";
import AdminGallery from "@/components/admin/AdminGallery";
import AdminAudit from "@/components/admin/AdminAudit";

type AdminTab = "appointments" | "blocking" | "gallery" | "inventory" | "orders" | "audit";

const tabs = [
  { key: "appointments" as AdminTab, label: "Citas", icon: CalendarDays },
  { key: "blocking" as AdminTab, label: "Bloqueos", icon: Lock },
  { key: "gallery" as AdminTab, label: "Galería", icon: Image },
  { key: "inventory" as AdminTab, label: "Inventario", icon: Package },
  { key: "audit" as AdminTab, label: "Registro", icon: FileText },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("appointments");

  const handleLogout = () => {
    localStorage.removeItem("agl-admin-auth");
    window.location.href = "/management-access";
  };

  return (
    <main className="pt-16">
      <section className="py-6 md:py-12">
        <div className="container">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-1">
              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl text-foreground" style={{ lineHeight: "1.1" }}>
                Panel de Administración
              </h1>
              <button
                onClick={handleLogout}
                className="text-xs font-sans uppercase tracking-wide text-muted-foreground hover:text-destructive transition-colors active:scale-95"
              >
                Cerrar sesión
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6 sm:mb-8">Hola Ana — centro de control de AGL Beauty Salon</p>
          </ScrollReveal>

          {/* Tabs — horizontal scroll on mobile */}
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
          {activeTab === "inventory" && <AdminInventory />}
          {activeTab === "audit" && <AdminAudit />}
        </div>
      </section>
    </main>
  );
};

export default AdminDashboard;
