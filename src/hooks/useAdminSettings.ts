import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminSettings {
  id: string;
  bookings_enabled: boolean | null;
  today_closed: boolean | null;
  today_closed_date: string | null;
  vacation_start: string | null;
  vacation_end: string | null;
  about_text_es: string | null;
  about_text_en: string | null;
  about_text_eu: string | null;
  updated_at: string | null;
}

export const useAdminSettings = () => {
  return useQuery({
    queryKey: ["admin_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("id", "main")
        .single();
      if (error) throw error;
      return data as AdminSettings;
    },
  });
};

export const useUpdateAdminSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<AdminSettings>) => {
      const { error } = await supabase
        .from("admin_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", "main");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_settings"] }),
  });
};
