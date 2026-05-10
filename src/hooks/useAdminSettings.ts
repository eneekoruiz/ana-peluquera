/**
 * @fileoverview useAdminSettings.ts — Hook para los ajustes globales.
 * Actualizado para soportar MÚLTIPLES periodos de vacaciones.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

const QUERY_TIMEOUT_MS = 10000;

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
};

export interface VacationRange {
  start: string;
  end: string;
}

export interface AdminSettings {
  bookings_enabled: boolean;
  today_closed: boolean;
  today_closed_date: string | null;
  vacation_ranges: VacationRange[]; // 🔥 AHORA ES UNA LISTA INFINITA
}

const SETTINGS_DOC_REF = doc(db, "settings", "admin");
const OLD_SETTINGS_DOC_REF = doc(db, "admin", "settings");

export const useAdminSettings = () => {
  return useQuery({
    queryKey: ["admin_settings"],
    queryFn: async () => {
      let snap = await withTimeout(getDoc(SETTINGS_DOC_REF), QUERY_TIMEOUT_MS, "Timeout cargando ajustes");
      let data: any;

      if (!snap.exists()) {
        // Attempt migration from old path
        const oldSnap = await getDoc(OLD_SETTINGS_DOC_REF);
        if (oldSnap.exists()) {
          data = oldSnap.data();
          try {
            await setDoc(SETTINGS_DOC_REF, data);
            console.log("Migrated settings from admin/settings to settings/admin");
          } catch (e) {
            console.error("Failed to migrate settings", e);
          }
        } else {
          return {
            bookings_enabled: true,
            today_closed: false,
            today_closed_date: null,
            vacation_ranges: [],
          } as AdminSettings;
        }
      } else {
        data = snap.data();
      }
      
      // 🛠️ Migración automática: Si Ana tenía guardadas vacaciones con el sistema viejo, lo pasamos al nuevo
      if (!data.vacation_ranges) {
        data.vacation_ranges = [];
        if (data.vacation_start && data.vacation_end) {
          data.vacation_ranges.push({ start: data.vacation_start, end: data.vacation_end });
        }
      }
      
      return data as AdminSettings;
    },
    retry: 1,
  });
};

export const useUpdateAdminSettings = () => {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<AdminSettings>) => {
      const snap = await getDoc(SETTINGS_DOC_REF);
      
      if (!snap.exists()) {
        await setDoc(SETTINGS_DOC_REF, {
          bookings_enabled: true,
          today_closed: false,
          today_closed_date: null,
          vacation_ranges: [],
          ...updates
        });
      } else {
        await updateDoc(SETTINGS_DOC_REF, updates);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_settings"] });
      toast.success("Ajustes guardados correctamente");
    },
    onError: (err: Error) => {
      console.error("Error guardando ajustes:", err);
      toast.error("Error al guardar");
    },
  });
};