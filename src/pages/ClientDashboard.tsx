import ScrollReveal from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";

interface Reservation {
  id: string;
  product: string;
  date: string;
  status: "pending" | "ready" | "collected";
  price: number;
  qrCode: string;
}

const mockReservations: Reservation[] = [
  { id: "R-001", product: "Champú Reparador Intensivo", date: "2026-03-20", status: "ready", price: 18.50, qrCode: "QR-A1B2C3" },
  { id: "R-002", product: "Aceite de Barba Premium", date: "2026-03-21", status: "pending", price: 22.00, qrCode: "QR-D4E5F6" },
  { id: "R-003", product: "Mascarilla Nutritiva", date: "2026-03-15", status: "collected", price: 24.00, qrCode: "QR-G7H8I9" },
];

const statusConfig = {
  pending: { label: "Pendiente", className: "bg-sand-light text-sand-dark" },
  ready: { label: "Listo para recoger", className: "bg-green-50 text-green-700" },
  collected: { label: "Recogido", className: "bg-secondary text-muted-foreground" },
};

const ClientDashboard = () => {
  return (
    <main className="pt-16">
      <section className="py-16 md:py-24">
        <div className="container max-w-2xl">
          <ScrollReveal>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2" style={{ lineHeight: '1.1' }}>
              Mis Reservas
            </h1>
            <p className="text-sm text-muted-foreground mb-12">
              Gestiona tus productos reservados y códigos QR
            </p>
          </ScrollReveal>

          <div className="space-y-4">
            {mockReservations.map((res, i) => {
              const status = statusConfig[res.status];
              return (
                <ScrollReveal key={res.id} delay={i * 100}>
                  <div className="bg-card rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-serif text-base text-foreground truncate">{res.product}</h3>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-sans uppercase tracking-wide ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{res.id}</span>
                          <span>{res.date}</span>
                          <span className="font-medium text-foreground tabular-nums">{res.price.toFixed(2)} €</span>
                        </div>
                      </div>
                    </div>

                    {res.status !== "collected" && (
                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* QR placeholder */}
                          <div className="w-12 h-12 bg-sand-light rounded flex items-center justify-center">
                            <span className="text-[8px] font-mono text-muted-foreground">QR</span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">{res.qrCode}</span>
                        </div>
                        {res.status === "ready" && (
                          <Button variant="sand" size="sm">
                            Mostrar QR
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          {mockReservations.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">No tienes reservas activas</p>
              <Button variant="hero" asChild>
                <a href="/catalogo">Explorar Catálogo</a>
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default ClientDashboard;
