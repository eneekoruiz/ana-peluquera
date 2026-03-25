import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DBService {
  id: string;
  slug: string;
  label_es: string;
  label_en: string;
  label_eu: string;
  category: string;
  duration_min: number;
  icon_name: string;
  price_cents: number | null;
  price_from: boolean | null;
  description_es: string | null;
  description_en: string | null;
  description_eu: string | null;
  phase1_min: number | null;
  phase2_min: number | null;
  phase3_min: number | null;
  sort_order: number | null;
  visible: boolean | null;
}

export const useServices = (includeHidden = false) => {
  return useQuery({
    queryKey: ["services", includeHidden],
    queryFn: async () => {
      let query = supabase.from("services").select("*").order("sort_order");
      if (!includeHidden) {
        query = query.eq("visible", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as DBService[];
    },
  });
};

export const getLocalizedLabel = (svc: DBService, lang: string) => {
  if (lang === "en") return svc.label_en;
  if (lang === "eu") return svc.label_eu;
  return svc.label_es;
};

export const getLocalizedDescription = (svc: DBService, lang: string) => {
  if (lang === "en") return svc.description_en || "";
  if (lang === "eu") return svc.description_eu || "";
  return svc.description_es || "";
};
