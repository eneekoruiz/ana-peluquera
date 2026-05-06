import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { readCalendarWatchConfig } from "@/lib/calendarWebhookSync";
import { processCalendarWebhook } from "@/lib/calendarWebhookSync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/webhooks/calendar
 * Recibe notificaciones push de Google Calendar.
 * 🔒 SEGURIDAD:
 * - No requiere CORS (es comunicación servidor-a-servidor).
 * - Verifica Channel ID, Resource ID y Secret Token de Google.
 */
export async function POST(request: Request) {
  const channelId = request.headers.get("X-Goog-Channel-ID");
  const resourceId = request.headers.get("X-Goog-Resource-ID");
  const resourceState = request.headers.get("X-Goog-Resource-State");
  const channelToken = request.headers.get("X-Goog-Channel-Token");

  if (!channelId || !resourceId || !resourceState) {
    return new NextResponse("Missing headers", { status: 400 });
  }

  // Si es un ping de sincronización inicial, respondemos OK
  if (resourceState === "sync") {
    return new NextResponse(null, { status: 200 });
  }

  try {
    const settingsSnap = await db.collection("admin").doc("settings").get();
    const watchConfig = readCalendarWatchConfig(settingsSnap.data());

    if (!watchConfig) {
      return new NextResponse("Webhook not configured", { status: 401 });
    }

    // 🛡️ VALIDACIÓN: El mensaje debe venir del canal y recurso que registramos
    if (watchConfig.channelId !== channelId || watchConfig.resourceId !== resourceId) {
      return new NextResponse("Forbidden: Channel mismatch", { status: 403 });
    }

    // 🛡️ VALIDACIÓN: El token secreto debe coincidir
    if (watchConfig.secretToken && watchConfig.secretToken !== channelToken) {
      return new NextResponse("Forbidden: Token mismatch", { status: 403 });
    }

    // Procesamos el webhook en segundo plano para responder rápido a Google
    void processCalendarWebhook(request).catch((error) => {
      console.error("❌ Error procesando webhook en background:", error);
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("❌ Error en webhook handler:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Bloqueamos OPTIONS para no dar pistas
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
