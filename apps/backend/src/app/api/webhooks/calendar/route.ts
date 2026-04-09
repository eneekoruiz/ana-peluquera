import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { readCalendarWatchConfig } from "@/lib/calendarWebhookSync";
import { processCalendarWebhook } from "@/lib/calendarWebhookSync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers });
}

export async function POST(request: Request) {
  const channelId = request.headers.get("X-Goog-Channel-ID");
  const resourceId = request.headers.get("X-Goog-Resource-ID");
  const resourceState = request.headers.get("X-Goog-Resource-State");
  const channelToken = request.headers.get("X-Goog-Channel-Token");

  if (!channelId || !resourceId || !resourceState) {
    return NextResponse.json({ error: "Missing Google webhook headers" }, { status: 401, headers });
  }

  if (!["sync", "exists", "not_exists"].includes(resourceState)) {
    return NextResponse.json({ error: "Invalid Google webhook resource state" }, { status: 400, headers });
  }

  const settingsSnap = await db.collection("admin").doc("settings").get();
  const watchConfig = readCalendarWatchConfig(settingsSnap.data() as Record<string, unknown> | undefined);

  if (!watchConfig) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 401, headers });
  }

  if (watchConfig.channelId !== channelId || watchConfig.resourceId !== resourceId) {
    return NextResponse.json({ error: "Webhook channel mismatch" }, { status: 403, headers });
  }

  if (watchConfig.secretToken && watchConfig.secretToken !== channelToken) {
    return NextResponse.json({ error: "Webhook token mismatch" }, { status: 403, headers });
  }

  if (resourceState === "sync") {
    return NextResponse.json({ ok: true, skipped: true, reason: "sync_handshake" }, { status: 200, headers });
  }

  void processCalendarWebhook(request).catch((error) => {
    console.error("Calendar webhook background processing failed.", error);
  });

  return NextResponse.json({ ok: true }, { status: 200, headers });
}
