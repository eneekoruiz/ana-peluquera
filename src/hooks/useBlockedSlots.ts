import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";

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
      // Hacemos la consulta a la colección "blocked_slots" ordenando por fecha
      const q = query(collection(db, "blocked_slots"), orderBy("blocked_date", "asc"));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlockedSlot[];
    },
  });
};

export const useCreateBlockedSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slot: { blocked_date: string; start_time: string; end_time: string; reason?: string }) => {
      const newSlot = {
        ...slot,
        created_at: new Date().toISOString()
      };
      // Insertamos el nuevo documento en Firebase
      await addDoc(collection(db, "blocked_slots"), newSlot);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocked_slots"] }),
  });
};

export const useDeleteBlockedSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Borramos el documento por su ID
      await deleteDoc(doc(db, "blocked_slots", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocked_slots"] }),
  });
};