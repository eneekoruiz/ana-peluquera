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
}

export const services: ServiceItem[] = [
  // Peluquería
  { id: "corte", label: "Corte", duration: "30 min", durationMin: 30, description: "Corte personalizado adaptado a tu estilo y tipo de cabello", icon: Scissors, category: "peluqueria" },
  { id: "color", label: "Coloración", duration: "90 min", durationMin: 90, description: "Color profesional con productos de alta gama para un resultado natural", icon: Palette, category: "peluqueria" },
  { id: "mechas", label: "Mechas & Balayage", duration: "120 min", durationMin: 120, description: "Técnicas de iluminación para un look radiante y multidimensional", icon: Sparkles, category: "peluqueria" },
  { id: "peinado", label: "Peinado", duration: "45 min", durationMin: 45, description: "Peinados para eventos especiales, bodas y celebraciones", icon: Paintbrush, category: "peluqueria" },
  { id: "tratamiento", label: "Tratamiento Capilar", duration: "60 min", durationMin: 60, description: "Tratamientos reparadores con keratina y aceites esenciales", icon: Droplets, category: "peluqueria" },
  { id: "barba", label: "Barba & Perfilado", duration: "20 min", durationMin: 20, description: "Recorte, perfilado y cuidado profesional de barba", icon: CircleDot, category: "peluqueria" },
  // Masajes
  { id: "masaje-relajante", label: "Masaje Relajante", duration: "60 min", durationMin: 60, description: "Masaje corporal descontracturante con aceites esenciales", icon: Hand, category: "masajes" },
  { id: "masaje-facial", label: "Tratamiento Facial", duration: "45 min", durationMin: 45, description: "Limpieza profunda e hidratación con productos naturales", icon: Flower2, category: "masajes" },
  { id: "masaje-craneal", label: "Masaje Craneal", duration: "30 min", durationMin: 30, description: "Técnica relajante para aliviar tensión y estrés", icon: Sparkles, category: "masajes" },
];

export type ServiceCategory = "peluqueria" | "masajes";

export const categoryLabels: Record<ServiceCategory, string> = {
  peluqueria: "Peluquería",
  masajes: "Masajes & Bienestar",
};
