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
  // Fases para la lógica Sandwich
  phase1_min?: number;
  phase2_min?: number;
  phase3_min?: number;
  phase2_released?: boolean;
  current_phase?: string;
}

/**
 * 📡 HOOK DE DISPONIBILIDAD (Para el formulario de reserva)
 * Consulta al servidor los huecos ocupados en Google Calendar y Firebase.
 */
export const useBookingsByDate = (date: string) => {
  return useQuery({
    queryKey: ["bookings", date],
    queryFn: async () => {
      // Llamamos al endpoint de disponibilidad real
      const response = await fetch(`${API_URL}/admin/settings/availability?date=${date}`);
      if (!response.ok) throw new Error("Error al obtener disponibilidad");
      
      const data = await response.json();
      
      // Transformamos los tramos ISO de Google a formato HH:mm para la UI
      return (data.busy || []).map((slot: any) => ({
        start_time: new Date(slot.start).toLocaleTimeString("es-ES", { 
          hour: "2-digit", 
          minute: "2-digit", 
          hour12: false 
        }),
        end_time: new Date(slot.end).toLocaleTimeString("es-ES", { 
          hour: "2-digit", 
          minute: "2-digit", 
          hour12: false 
        }),
        status: "confirmed"
      }));
    },
    enabled: !!date,
  });
};

/**
 * 👩‍💻 HOOK DE ADMINISTRACIÓN (Para el panel de Ana)
 * Obtiene las reservas detalladas con nombres y teléfonos.
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
 * Orquesta Firebase + Google Calendar + Email.
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
 * 🛠️ HOOK DE ACTUALIZACIÓN (Para Ana)
 * Permite confirmar, cancelar o liberar el hueco del sándwich.
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