/**
 * @fileoverview useRevista.ts — Hook para gestionar las fotos de la revista.
 * Conectado directamente a Firebase Firestore.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query } from "firebase/firestore";
import { toast } from "sonner";
import { deleteStorageFile } from "@/lib/storageManager";

export interface MagazineItem {
  id: string;
  image_url: string;
  title: string;
  title_en?: string;
  title_eu?: string;
  description?: string;
  description_en?: string;
  description_eu?: string;
  span: boolean;
  sort_order: number;
  is_visible: boolean;
}

const COLLECTION_NAME = "magazine";

export const useRevista = (includeHidden = false) => {
  return useQuery({
    queryKey: ["magazine", includeHidden],
    queryFn: async () => {
      const q = query(collection(db, COLLECTION_NAME));
      const snapshot = await getDocs(q);
      
      let data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MagazineItem[];

      // Filtrar ocultos si no somos admin
      if (!includeHidden) {
        data = data.filter(item => item.is_visible);
      }

      // Ordenar (si no tienen sort_order, los pone al final)
      data.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));

      return data;
    },
  });
};

export const useAddMagazineItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newItem: Omit<MagazineItem, "id" | "sort_order">) => {
      const newId = `mag-${Date.now()}`;
      const itemToSave = {
        ...newItem,
        sort_order: 999, // Lo manda al final
      };
      await setDoc(doc(db, COLLECTION_NAME, newId), itemToSave);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["magazine"] });
      toast.success("Publicación añadida");
    },
    onError: (err: Error) => toast.error("Error al añadir: " + err.message),
  });
};

export const useUpdateMagazineItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MagazineItem> }) => {
      await updateDoc(doc(db, COLLECTION_NAME, id), updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["magazine"] }),
    onError: (err: Error) => toast.error("Error al actualizar: " + err.message),
  });
};

export const useDeleteMagazineItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      // Si quieres, aquí podrías llamar a deleteStorageFile(url) para borrar de Cloudinary
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["magazine"] });
      toast.success("Publicación eliminada");
    },
    onError: (err: Error) => toast.error("Error al eliminar: " + err.message),
  });
};

export const useReorderMagazine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Implementación simple para reordenar
      // Por ahora no la usamos en la vista, pero la dejamos lista
      const promises = ids.map((id, index) => 
        updateDoc(doc(db, COLLECTION_NAME, id), { sort_order: index })
      );
      await Promise.all(promises);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["magazine"] }),
  });
};