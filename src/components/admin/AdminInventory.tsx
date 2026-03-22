import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  stock: number;
}

const mockProducts: Product[] = [
  { id: "1", name: "Champú Reparador Intensivo", category: "Cabello", cost: 9.00, price: 18.50, stock: 12 },
  { id: "2", name: "Mascarilla Nutritiva", category: "Cabello", cost: 11.50, price: 24.00, stock: 8 },
  { id: "3", name: "Aceite de Barba Premium", category: "Barba", cost: 10.00, price: 22.00, stock: 10 },
  { id: "4", name: "Esmalte Gel Larga Duración", category: "Uñas", cost: 5.00, price: 12.00, stock: 20 },
];

const AdminInventory = () => (
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
                    <Button variant="ghost" size="sm" onClick={() => toast.info("Ajuste manual de stock")}>Ajustar</Button>
                    <Button variant="ghost" size="sm" onClick={() => toast.info("Registrar merma")}>Merma</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

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
);

export default AdminInventory;
