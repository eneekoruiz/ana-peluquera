import { Scissors, Hand, Sparkles, Paintbrush, Droplets, Palette, Flower2, CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ServiceItem {
  id: string;
  label: string;
  duration: string;
  durationMin: number;
  description: string;
  icon: LucideIcon;
  category: "peluqueria" | "masajes";
  priceCents: number;
  priceFrom: boolean;
  /** Sandwich booking: active phase 1 duration in minutes */
  phase1Min?: number;
  /** Sandwich booking: processing/wait phase duration in minutes */
  phase2Min?: number;
  /** Sandwich booking: active phase 3 duration in minutes */
  phase3Min?: number;
}

export const services: ServiceItem[] = [
  // Peluquería
  { id: "corte", label: "Corte", duration: "30 min", durationMin: 30, description: "Corte personalizado adaptado a tu estilo y tipo de cabello", icon: Scissors, category: "peluqueria", priceCents: 2500, priceFrom: true },
  { id: "color", label: "Coloración", duration: "90 min", durationMin: 90, description: "Color profesional con productos de alta gama para un resultado natural", icon: Palette, category: "peluqueria", priceCents: 4500, priceFrom: true },
  { id: "mechas", label: "Mechas & Balayage", duration: "120 min", durationMin: 120, description: "Técnicas de iluminación para un look radiante y multidimensional", icon: Sparkles, category: "peluqueria", priceCents: 6000, priceFrom: true, phase1Min: 30, phase2Min: 45, phase3Min: 30 },
  { id: "peinado", label: "Peinado", duration: "45 min", durationMin: 45, description: "Peinados para eventos especiales, bodas y celebraciones", icon: Paintbrush, category: "peluqueria", priceCents: 3000, priceFrom: false },
  { id: "tratamiento", label: "Tratamiento Capilar", duration: "60 min", durationMin: 60, description: "Tratamientos reparadores con keratina y aceites esenciales", icon: Droplets, category: "peluqueria", priceCents: 3500, priceFrom: true },
  { id: "barba", label: "Barba & Perfilado", duration: "20 min", durationMin: 20, description: "Recorte, perfilado y cuidado profesional de barba", icon: CircleDot, category: "peluqueria", priceCents: 1500, priceFrom: false },
  // Masajes & Bienestar
  { id: "masaje-relajante", label: "Masaje Relajante", duration: "60 min", durationMin: 60, description: "Masaje corporal descontracturante con aceites esenciales", icon: Hand, category: "masajes", priceCents: 4000, priceFrom: false },
  { id: "masaje-facial", label: "Tratamiento Facial", duration: "45 min", durationMin: 45, description: "Limpieza profunda e hidratación con productos naturales", icon: Flower2, category: "masajes", priceCents: 3500, priceFrom: false },
  { id: "masaje-craneal", label: "Masaje Craneal", duration: "30 min", durationMin: 30, description: "Técnica relajante para aliviar tensión y estrés", icon: Sparkles, category: "masajes", priceCents: 2500, priceFrom: false },
];

export type ServiceCategory = "peluqueria" | "masajes";

export const categoryLabels: Record<ServiceCategory, string> = {
  peluqueria: "Peluquería",
  masajes: "Masajes & Bienestar",
};
