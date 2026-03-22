import ScrollReveal from "@/components/ScrollReveal";

interface StockLog {
  id: string;
  date: string;
  product: string;
  user: string;
  qty: number;
  reason: string;
}

const mockLogs: StockLog[] = [
  { id: "L1", date: "2026-03-22 09:14", product: "Champú Reparador", user: "Ana", qty: -1, reason: "Uso en Salón" },
  { id: "L2", date: "2026-03-21 16:30", product: "Esmalte Gel", user: "Ana", qty: -2, reason: "Producto Roto/Caducado" },
  { id: "L3", date: "2026-03-20 11:00", product: "Aceite de Barba", user: "Ana", qty: 5, reason: "Recepción de pedido" },
  { id: "L4", date: "2026-03-19 18:45", product: "Mascarilla Nutritiva", user: "Ana", qty: -1, reason: "Venta — R-003" },
];

const AdminAudit = () => (
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
);

export default AdminAudit;
