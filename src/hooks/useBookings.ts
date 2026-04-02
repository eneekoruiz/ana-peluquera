import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface Booking {
  id: string;
  service_id: string | null;
  booking_date: string;
  start_time: string; // Formato "HH:mm"
  end_time: string;   // Formato "HH:mm"
  client_name: string;
  client_phone: string;
  client_email: string | null;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes: string | null;
  phase1_min?: number;
  phase2_min?: number;
  phase3_min?: number;
  phase2_released?: boolean;
  current_phase?: string;
  isManual?: boolean;
}

/**
 * 📡 HOOK DE DISPONIBILIDAD (Para el formulario de reserva)
 * Ahora llama al endpoint correcto y no sufre desfases horarios.
 */
export const useBookingsByDate = (date: string) => {
  return useQuery({
    queryKey: ["bookings", date],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/bookings?date=${date}`);
      if (!response.ok) throw new Error("Error al obtener disponibilidad");
      
      const data = await response.json();
      
      // Mapeamos TODO a start_time y end_time (con barra baja) 
      // para que el scheduler no se vuelva loco
      return (Array.isArray(data) ? data : []).map((slot: any) => ({
        ...slot,
        start_time: (slot.startTime || slot.start_time || "").split('T')[1]?.substring(0, 5) || "00:00",
        end_time: (slot.endTime || slot.end_time || "").split('T')[1]?.substring(0, 5) || "23:59",
      }));
    },
    enabled: !!date,
  });
};

/**
 * 👩‍💻 HOOK DE ADMINISTRACIÓN (Para el panel de Ana)
 */
export const useAdminBookings = (date: string) => {
  return useQuery({
    queryKey: ["admin-bookings", date],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/bookings?date=${date}`);
      if (!response.ok) throw new Error("Error al cargar la agenda de Ana");
      return response.json() as Promise<Booking[]>;
    },
    enabled: !!date,
  });
};

/**
 * 🚀 HOOK DE CREACIÓN
 */
export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (booking: any) => {
      const response = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(booking),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fallo en el servidor");
      }
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("¡Reserva confirmada!");
    },
    onError: (error: any) => toast.error("Error: " + error.message)
  });
};

/**
 * 🛠️ HOOK DE ACTUALIZACIÓN
 */
export const useUpdateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Booking>) => {
      const response = await fetch(`${API_URL}/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("No se pudo actualizar");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
};