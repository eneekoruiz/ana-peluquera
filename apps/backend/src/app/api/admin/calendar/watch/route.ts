import { NextResponse } from "next/server";
import { requireAdminFromIdToken } from "@/lib/firebaseAdmin";
import { registerCalendarWatch } from "@/lib/calendarWebhookSync";
import { db } from "@/lib/firebaseAdmin";
import { readCalendarWatchConfig } from "@/lib/calendarWebhookSync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header) {
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) return match[1];
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)firebaseIdToken=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

async function requireAuthenticatedAdmin(request: Request) {
  const idToken = getBearerToken(request);
  if (!idToken) {
    const err = new Error("Unauthorized");
    (err as { code?: string }).code = "UNAUTHORIZED";
    throw err;
  }

  await requireAdminFromIdToken(idToken);
}

export async function GET(request: Request) {
  try {
    await requireAuthenticatedAdmin(request);

    const settingsSnap = await db.collection("admin").doc("settings").get();
    const settingsData = settingsSnap.data() as Record<string, unknown> | undefined;
    const watchConfig = readCalendarWatchConfig(settingsData);
    const googleLinked = !!settingsData?.google_refresh_token;

    if (!watchConfig) {
      return NextResponse.json(
        { ok: true, configured: false, googleLinked },
        { status: 200, headers: corsHeaders }
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
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const code = (error as { code?: string })?.code;

    if (code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    if (message.includes("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    console.error("Failed to read Google Calendar watch status.", error);
    return NextResponse.json(
      { error: "No se pudo leer el estado del webhook de Google Calendar." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedAdmin(request);

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
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const message = error instanceof Error ? error.message : "Unknown error";

    if (code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    if (message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: corsHeaders }
      );
    }

    console.error("Failed to register Google Calendar watch.", error);
    return NextResponse.json(
      { error: "No se pudo registrar el webhook de Google Calendar." },
      { status: 500, headers: corsHeaders }
    );
  }
}
