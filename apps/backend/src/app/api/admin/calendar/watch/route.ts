import { NextResponse } from "next/server";
import { registerCalendarWatch } from "@/lib/calendarWebhookSync";
import { getDb } from "@/lib/firebaseAdmin";
import { readCalendarWatchConfig } from "@/lib/calendarWebhookSync";
import { requireAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('origin');
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : (ALLOWED_ORIGINS[0] || ''),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.authorized) return auth.response;

  const headers = getCorsHeaders(request);

  try {
    const settingsSnap = await getDb().collection("settings").doc("admin").get();
    const settingsData = settingsSnap.data() as Record<string, unknown> | undefined;
    const watchConfig = readCalendarWatchConfig(settingsData);
    const googleLinked = !!settingsData?.google_refresh_token;

    if (!watchConfig) {
      return NextResponse.json(
        { ok: true, configured: false, googleLinked },
        { status: 200, headers }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        configured: true,
        calendarId: watchConfig.calendarId,
        webhookUrl: watchConfig.webhookUrl,
        channelId: watchConfig.channelId,
        resourceId: watchConfig.resourceId,
        expiration: watchConfig.expiration,
        updatedAt: watchConfig.updatedAt,
        hasSyncToken: !!watchConfig.syncToken,
        googleLinked,
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Failed to read Google Calendar watch status.", error);
    return NextResponse.json(
      { error: "No se pudo leer el estado del webhook de Google Calendar." },
      { status: 500, headers }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.authorized) return auth.response;

  const headers = getCorsHeaders(request);

  try {
    const payload = await registerCalendarWatch({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      webhookUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")}/api/webhooks/calendar`,
    });

    return NextResponse.json(
      {
        ok: true,
        channelId: payload.channelId,
        resourceId: payload.resourceId,
        expiration: payload.expiration,
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Failed to register Google Calendar watch.", error);
    return NextResponse.json(
      { error: "No se pudo registrar el webhook de Google Calendar." },
      { status: 500, headers }
    );
  }
}
