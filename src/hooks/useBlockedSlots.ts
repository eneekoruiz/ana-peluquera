import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BlockedSlot {
  id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_at: string | null;
}

export const useBlockedSlots = () => {
  return useQuery({
    queryKey: ["blocked_slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_slots")
        .select("*")
        .order("blocked_date", { ascending: true });
      if (error) throw error;
      return data as BlockedSlot[];
    },
  });
};

export const useCreateBlockedSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slot: { blocked_date: string; start_time: string; end_time: string; reason?: string }) => {
      const { error } = await supabase.from("blocked_slots").insert(slot);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocked_slots"] }),
  });
};

export const useDeleteBlockedSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocked_slots"] }),
  });
};
