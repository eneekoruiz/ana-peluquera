import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Plus, Package, ClipboardList, FileText } from "lucide-react";

type AdminTab = "inventory" | "orders" | "audit";

interface Product {
  id: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  stock: number;
}

interface Order {
  id: string;
  client: string;
  product: string;
  date: string;
  status: "pending" | "ready" | "collected" | "cancelled";
  price: number;
}

interface StockLog {
  id: string;
  date: string;
  product: string;
  user: string;
  qty: number;
  reason: string;
}

const mockProducts: Product[] = [
  { id: "1", name: "Champú Reparador Intensivo", category: "Cabello", cost: 9.00, price: 18.50, stock: 12 },
  { id: "2", name: "Mascarilla Nutritiva", category: "Cabello", cost: 11.50, price: 24.00, stock: 8 },
  { id: "3", name: "Aceite de Barba Premium", category: "Barba", cost: 10.00, price: 22.00, stock: 10 },
  { id: "4", name: "Esmalte Gel Larga Duración", category: "Uñas", cost: 5.00, price: 12.00, stock: 20 },
];

const mockOrders: Order[] = [
  { id: "R-001", client: "María López", product: "Champú Reparador", date: "2026-03-20", status: "pending", price: 18.50 },
  { id: "R-002", client: "Carlos Ruiz", product: "Aceite de Barba", date: "2026-03-21", status: "ready", price: 22.00 },
  { id: "R-003", client: "Laura Martín", product: "Mascarilla Nutritiva", date: "2026-03-19", status: "collected", price: 24.00 },
];

const mockLogs: StockLog[] = [
  { id: "L1", date: "2026-03-22 09:14", product: "Champú Reparador", user: "Ana", qty: -1, reason: "Uso en Salón" },
  { id: "L2", date: "2026-03-21 16:30", product: "Esmalte Gel", user: "Ana", qty: -2, reason: "Producto Roto/Caducado" },
  { id: "L3", date: "2026-03-20 11:00", product: "Aceite de Barba", user: "Ana", qty: 5, reason: "Recepción de pedido" },
  { id: "L4", date: "2026-03-19 18:45", product: "Mascarilla Nutritiva", user: "Ana", qty: -1, reason: "Venta — R-003" },
];

const orderStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-sand-light text-sand-dark" },
  ready: { label: "Listo", className: "bg-green-50 text-green-700" },
  collected: { label: "Recogido", className: "bg-secondary text-muted-foreground" },
  cancelled: { label: "Cancelado", className: "bg-red-50 text-red-600" },
};

const tabs = [
  { key: "inventory" as AdminTab, label: "Inventario", icon: Package },
  { key: "orders" as AdminTab, label: "Pedidos", icon: ClipboardList },
  { key: "audit" as AdminTab, label: "Registro", icon: FileText },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("inventory");

  return (
    <main className="pt-16">
      <section className="py-8 md:py-12">
        <div className="container">
          <ScrollReveal>
            <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-1" style={{ lineHeight: '1.1' }}>
              Panel de Administración
            </h1>
            <p className="text-sm text-muted-foreground mb-8">Centro de control de AGL Beauty Salon</p>
          </ScrollReveal>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-secondary rounded-lg p-1 max-w-md">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 flex-1 justify-center py-2.5 px-3 text-xs font-sans uppercase tracking-wide rounded-md transition-all duration-200 active:scale-95 ${
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

          {/* Inventory tab */}
          {activeTab === "inventory" && (
            <ScrollReveal>
              <div className="bg-card rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-serif text-lg text-foreground">Productos</h2>
                  <Button variant="sand" size="sm" className="gap-1">
                    <Plus size={14} />
                    Añadir
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-3 text-xs font-sans uppercase tracking-wide text-muted-foreground font-medium">Producto</th>
                        <th className="text-left p-3 text-xs font-sans uppercase tracking-wide text-muted-foreground font-medium">Cat.</th>
                        <th className="text-right p-3 text-xs font-sans uppercase tracking-wide text-muted-foreground font-medium">Coste</th>
                        <th className="text-right p-3 text-xs font-sans uppercase tracking-wide text-muted-foreground font-medium">Precio</th>
                        <th className="text-right p-3 text-xs font-sans uppercase tracking-wide text-muted-foreground font-medium">Stock</th>
                        <th className="text-right p-3 text-xs font-sans uppercase tracking-wide text-muted-foreground font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockProducts.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-medium text-foreground">{p.name}</td>
                          <td className="p-3 text-muted-foreground">{p.category}</td>
                          <td className="p-3 text-right tabular-nums text-muted-foreground">{p.cost.toFixed(2)} €</td>
                          <td className="p-3 text-right tabular-nums text-foreground font-medium">{p.price.toFixed(2)} €</td>
                          <td className="p-3 text-right tabular-nums">
                            <span className={p.stock <= 5 ? "text-destructive" : "text-foreground"}>{p.stock}</span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => toast.info("Ajuste manual de stock")}>
                                Ajustar
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => toast.info("Registrar merma")}>
                                Merma
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stock adjustment info */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-card rounded-lg p-5 shadow-sm">
                  <h3 className="font-serif text-base text-foreground mb-2">Ajuste Manual</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sobrescribir stock tras recuento físico. Requiere motivo: Error de conteo, Pérdida, o Robo.
                  </p>
                </div>
                <div className="bg-card rounded-lg p-5 shadow-sm">
                  <h3 className="font-serif text-base text-foreground mb-2">Mermas & Uso</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Registrar "Producto Roto/Caducado" o "Uso en Salón" para consumo interno.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Orders tab */}
          {activeTab === "orders" && (
            <ScrollReveal>
              <div className="bg-card rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="font-serif text-lg text-foreground">Pedidos Pendientes</h2>
                </div>
                <div className="divide-y divide-border">
                  {mockOrders.map((order) => {
                    const status = orderStatusConfig[order.status];
                    return (
                      <div key={order.id} className="p-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-sm font-medium text-foreground">{order.product}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-sans uppercase tracking-wide ${status.className}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{order.id}</span>
                              <span>{order.client}</span>
                              <span>{order.date}</span>
                              <span className="font-medium tabular-nums">{order.price.toFixed(2)} €</span>
                            </div>
                          </div>

                          {order.status === "pending" && (
                            <div className="flex gap-1 shrink-0">
                              <Button variant="sand" size="sm" onClick={() => toast.success("Marcado como listo")}>
                                Listo
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => toast.error("Reserva cancelada — sin stock")}>
                                Sin Stock
                              </Button>
                            </div>
                          )}
                          {order.status === "ready" && (
                            <Button variant="hero" size="sm" onClick={() => toast.success("Venta finalizada")}>
                              Cobrado
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Audit tab */}
          {activeTab === "audit" && (
            <ScrollReveal>
              <div className="bg-card rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="font-serif text-lg text-foreground">Registro de Movimientos</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-3 text-xs font-sans uppercase tracking-wide text-muted-foreground font-medium">Fecha</th>
                        <th className="text-left p-3 text-xs font-sans uppercase tracking-wide text-muted-foreground font-medium">Producto</th>
                        <th className="text-left p-3 text-xs font-sans uppercase tracking-wide text-muted-foreground font-medium">Usuario</th>
                        <th className="text-right p-3 text-xs font-sans uppercase tracking-wide text-muted-foreground font-medium">Cant.</th>
                        <th className="text-left p-3 text-xs font-sans uppercase tracking-wide text-muted-foreground font-medium">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockLogs.map((log) => (
                        <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-3 text-muted-foreground tabular-nums whitespace-nowrap">{log.date}</td>
                          <td className="p-3 text-foreground">{log.product}</td>
                          <td className="p-3 text-muted-foreground">{log.user}</td>
                          <td className={`p-3 text-right tabular-nums font-medium ${log.qty > 0 ? "text-green-600" : "text-destructive"}`}>
                            {log.qty > 0 ? `+${log.qty}` : log.qty}
                          </td>
                          <td className="p-3 text-muted-foreground">{log.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>
    </main>
  );
};

export default AdminDashboard;
