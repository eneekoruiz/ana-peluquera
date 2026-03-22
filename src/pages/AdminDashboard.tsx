import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { Package, CalendarDays, Lock, Image, FileText, ClipboardList } from "lucide-react";
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

  return (
    <main className="pt-16">
      <section className="py-8 md:py-12">
        <div className="container">
          <ScrollReveal>
            <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-1" style={{ lineHeight: "1.1" }}>
              Panel de Administración
            </h1>
            <p className="text-sm text-muted-foreground mb-8">Hola Ana — centro de control de AGL Beauty Salon</p>
          </ScrollReveal>

          {/* Tabs — horizontal scroll on mobile */}
          <div className="flex gap-1 mb-8 bg-secondary rounded-lg p-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 shrink-0 justify-center py-2.5 px-3 text-xs font-sans uppercase tracking-wide rounded-md transition-all duration-200 active:scale-95 ${
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
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
