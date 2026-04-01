/**
 * @fileoverview /api/webhooks/google-calendar — Webhook de sincronización bidireccional.
 *
 * Google Calendar envía una notificación a este endpoint cada vez que un evento
 * cambia en el calendario de Ana (creación, modificación o eliminación manual).
 *
 * Flujo:
 * 1. Verificar la cabecera `X-Goog-Channel-Token` contra el token de seguridad.
 * 2. Llamar a `getBusySlots()` para obtener el estado actualizado del calendario.
 * 3. Guardar el snapshot de intervalos ocupados en Firestore:
 *    `settings/calendar_sync` → `{ busy: [...], updatedAt: ISO }`.
 * 4. Devolver 200 para que Google no reintente.
 *
 * Registro del canal (ejecutar una vez en setup):
 * ```bash
 * POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/watch
 * {
 *   "id": "ag-beauty-sync-channel",
 *   "type": "web_hook",
 *   "address": "https://tu-backend.vercel.app/api/webhooks/google-calendar",
 *   "token": "<GOOGLE_WEBHOOK_SECRET>",
 *   "expiration": <timestamp_ms_en_el_futuro>
 * }
 * ```
 *
 * Variables de entorno necesarias:
 * - `GOOGLE_WEBHOOK_SECRET` — Token secreto de verificación.
 *
 * @module api/webhooks/google-calendar
 */

import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";
import { getBusySlots } from "@/lib/googleCalendar";

/** Número de días hacia adelante que se sincroniza en cada webhook. */
const SYNC_DAYS = 60;

/** Cabeceras CORS (solo GET/POST/OPTIONS necesita este endpoint). */
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers });
}

/**
 * POST /api/webhooks/google-calendar
 *
 * Google Calendar llama aquí cuando detecta cambios en el calendario.
 * Respondemos siempre con 200 para evitar reintentos, incluso si hay errores
 * internos (los logueamos pero no los propagamos a Google).
 *
 * @param request - Petición HTTP de Google Calendar.
 */
export async function POST(request: Request) {
  // ── 1. Verificación del token de seguridad ────────────────────────────────
  const channelToken = request.headers.get("X-Goog-Channel-Token");
  const expectedToken = process.env.GOOGLE_WEBHOOK_SECRET;

  if (!expectedToken) {
    console.error(
      "❌ GOOGLE_WEBHOOK_SECRET no está configurado. El webhook no puede verificar la autenticidad."
    );
    // Respondemos 200 para no levantar alertas en Google, pero logueamos el error
    return NextResponse.json({ ok: false, reason: "server_misconfigured" }, { headers });
  }

  if (channelToken !== expectedToken) {
    console.warn(
      `⚠️ Webhook rechazado: token inválido. Recibido: "${channelToken}"`
    );
    return NextResponse.json({ ok: false, reason: "invalid_token" }, { status: 401, headers });
  }

  // ── 2. Resincronización del calendario ───────────────────────────────────
  console.info("🔔 Webhook de Google Calendar recibido — iniciando resync…");

  try {
    const now = new Date();
    const future = new Date(now.getTime() + SYNC_DAYS * 24 * 60 * 60 * 1000);

    // Pedimos todos los slots ocupados para los próximos SYNC_DAYS días
    const { busy } = await getBusySlots({ start: now, end: future });

    // ── 3. Guardar snapshot en Firestore ─────────────────────────────────
    const db = getFirebaseAdminApp().firestore();

    const serializedBusy = busy.map((interval) => ({
      start: interval.start instanceof Date
        ? interval.start.toISOString()
        : interval.start,
      end: interval.end instanceof Date
        ? interval.end.toISOString()
        : interval.end,
      sourceEventId: interval.sourceEventId ?? null,
    }));

    await db.collection("settings").doc("calendar_sync").set(
      {
        busy: serializedBusy,
        updatedAt: new Date().toISOString(),
        syncedDays: SYNC_DAYS,
        triggeredBy: "google_webhook",
      },
      { merge: true }
    );

    console.info(
      `✅ Resync completado: ${serializedBusy.length} intervalos ocupados guardados en Firestore.`
    );

    return NextResponse.json(
      { ok: true, busySlots: serializedBusy.length },
      { status: 200, headers }
    );
  } catch (error) {
    // Siempre 200 para Google — logueamos el error internamente
    console.error("❌ Error durante el resync del webhook:", error);
    return NextResponse.json(
      { ok: false, reason: "sync_failed" },
      { status: 200, headers }
    );
  }
}
