import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Booking {
  id: string;
  service_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  status: string | null;
  notes: string | null;
  current_phase: string | null;
  phase2_released: boolean | null;
  created_at: string | null;
}

export const useBookingsByDate = (date: string) => {
  return useQuery({
    queryKey: ["bookings", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("booking_date", date)
        .order("start_time");
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!date,
  });
};

export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (booking: {
      service_id: string;
      booking_date: string;
      start_time: string;
      end_time: string;
      client_name: string;
      client_phone: string;
      client_email?: string;
      notes?: string;
      current_phase?: string;
    }) => {
      const { data, error } = await supabase
        .from("bookings")
        .insert(booking)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
};

export const useUpdateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Booking>) => {
      const { error } = await supabase.from("bookings").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
};
