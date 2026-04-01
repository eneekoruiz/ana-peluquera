import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, query } from "firebase/firestore";

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
  [key: string]: any;
}

/** Hook para obtener los servicios DIRECTAMENTE desde Firebase */
export const useServices = (includeHidden = false) => {
  return useQuery({
    queryKey: ["services", includeHidden],
    queryFn: async () => {
      const q = query(collection(db, "services"));
      const snapshot = await getDocs(q);
      
      let data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DBService[];

      if (!includeHidden) {
        data = data.filter(s => s.visible !== false); 
      }

      data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return data;
    },
  });
};

export const getLocalizedLabel = (svc: DBService, lang: string) => {
  if (lang === "en") return svc.label_en || svc.name || "";
  if (lang === "eu") return svc.label_eu || svc.name || "";
  return svc.label_es || svc.name || "";
};

export const getLocalizedDescription = (svc: DBService, lang: string) => {
  if (lang === "en") return svc.description_en || svc.description || "";
  if (lang === "eu") return svc.description_eu || svc.description || "";
  return svc.description_es || svc.description || "";
};

// 🔥 NUEVO: Hooks para editar el Título y Subtítulo de la página
export const useServicesPageContent = () => {
  return useQuery({
    queryKey: ["services_page_content"],
    queryFn: async () => {
      const ref = doc(db, "site_content", "services_page");
      const snap = await getDoc(ref);
      if (!snap.exists()) return {};
      return snap.data();
    }
  });
};

export const useUpdateServicesPageContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: any) => {
      const ref = doc(db, "site_content", "services_page");
      const snap = await getDoc(ref);
      if (!snap.exists()) await setDoc(ref, updates);
      else await updateDoc(ref, updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services_page_content"] })
  });
};