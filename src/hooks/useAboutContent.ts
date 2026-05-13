/**
 * @fileoverview useAboutContent — Hook reactivo para el contenido de "Quiénes Somos".
 *
 * Modificado para apuntar DIRECTAMENTE a Firebase Firestore, 
 * saltándose el backend para evitar errores de CORS y 404.
 *
 * @module useAboutContent
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/** Post del feed Instagram gestionado por Ana */
export interface InstagramPost {
  id: string;
  image_url: string;
  caption?: string;
  likes?: number;
  link?: string;
}

export type Language = 'es' | 'en' | 'eu';

type Localized<T extends string> = {
  [K in `${T}_${Language}`]?: string;
};

/** Contenido completo de la página Quiénes Somos. */
export type AboutContent = {
  ana_photo_url?: string;
  salon_photo_url?: string;
  instagram_handle?: string;
  feed_posts?: InstagramPost[];
} & Localized<'main_title'> 
  & Localized<'main_subtitle'> 
  & Localized<'storyTitle'> 
  & Localized<'story_p1'> 
  & Localized<'story_p2'> 
  & Localized<'story_p3'> 
  & Localized<'valuesTitle'> 
  & Localized<'value1_title'> 
  & Localized<'value1_desc'> 
  & Localized<'value2_title'> 
  & Localized<'value2_desc'> 
  & Localized<'value3_title'> 
  & Localized<'value3_desc'> 
  & Localized<'teamTitle'> 
  & Localized<'anaRole'> 
  & Localized<'feedTitle'> 
  & Localized<'feedSubtitle'>;

// Referencia directa al documento 'main' en la colección 'about_us'
const ABOUT_DOC_REF = doc(db, "about_us", "main");

/**
 * Hook para obtener el contenido de la página "Quiénes Somos".
 */
export const useAboutContent = () => {
  return useQuery<AboutContent>({
    queryKey: ["about_content"],
    queryFn: async () => {
      const snapshot = await getDoc(ABOUT_DOC_REF);
      if (!snapshot.exists()) {
        // Si no existe, devolvemos un objeto vacío para no romper la web
        return {} as AboutContent;
      }
      return snapshot.data() as AboutContent;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

/**
 * Hook para actualizar cualquier campo del contenido de About.
 */
export const useUpdateAboutContent = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<AboutContent>) => {
      const snapshot = await getDoc(ABOUT_DOC_REF);
      
      if (!snapshot.exists()) {
        // Si el documento no existe en Firebase, lo creamos
        await setDoc(ABOUT_DOC_REF, updates);
      } else {
        // Si existe, actualizamos solo los campos modificados
        await updateDoc(ABOUT_DOC_REF, updates);
      }
    },
    onSuccess: () => {
      // Invalida la caché para que la UI se actualice al instante
      qc.invalidateQueries({ queryKey: ["about_content"] });
    },
    onError: (err: Error) => {
      toast.error("Error al guardar: " + err.message);
    },
  });
};