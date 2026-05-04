import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace(/\/$/, "");

export type CalendarWatchStatus = {
  ok: boolean;
  configured: boolean;
  googleLinked?: boolean;
  calendarId?: string;
  webhookUrl?: string;
  channelId?: string;
  resourceId?: string;
  expiration?: string | null;
  updatedAt?: string;
  hasSyncToken?: boolean;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export function useCalendarWatchStatus() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ["calendar_watch_status", user?.uid],
    enabled: !!user && isAdmin,
    queryFn: async (): Promise<CalendarWatchStatus> => {
      const idToken = await user!.getIdToken();
      const response = await fetch(`${API_BASE}/admin/calendar/watch`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      return parseJsonResponse<CalendarWatchStatus>(response);
    },
    staleTime: 30_000,
  });
}

export function useCalendarHealth() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ["calendar_health", user?.uid],
    enabled: !!user && isAdmin,
    queryFn: async (): Promise<{ status: 'connected' | 'disconnected', error?: string }> => {
      const response = await fetch(`${API_BASE}/admin/calendar/status`);
      return parseJsonResponse(response);
    },
    staleTime: 60_000, // 1 minuto de cache para no saturar
  });
}


export function useRegisterCalendarWatch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<CalendarWatchStatus> => {
      if (!user) throw new Error("Debes iniciar sesión para activar el webhook.");
      const idToken = await user.getIdToken();
      const response = await fetch(`${API_BASE}/admin/calendar/watch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      return parseJsonResponse<CalendarWatchStatus>(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendar_watch_status"] });
      toast.success("Webhook de Google Calendar activo");
    },
    onError: (error: Error) => {
      toast.error("No se pudo activar el webhook", { description: error.message });
    },
  });
}

export function getGoogleOAuthUrl() {
  const apiBase = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;
  return `${apiBase}/api/auth/google`;
}
