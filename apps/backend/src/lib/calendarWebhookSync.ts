import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { randomUUID } from "node:crypto";
import type { calendar_v3 } from "googleapis";
import { db } from "@/lib/firebaseAdmin";
import { getGoogleCalendarClient } from "@/lib/googleCalendar";
import { sendCancellationEmail, sendRescheduleEmail } from "@/lib/notifications";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Europe/Madrid";
const SETTINGS_DOC_PATH = ["admin", "settings"] as const;
const LOCK_DOC_PATH = ["admin", "calendar_webhook_lock"] as const;
const WATCH_FIELD = "googleCalendarWatch";
const LOCK_TTL_MS = 2 * 60 * 1000;

type FirestoreDocData = Record<string, unknown>;

export type CalendarWatchConfig = {
  calendarId: string;
  webhookUrl: string;
  channelId: string;
  resourceId: string;
  syncToken: string | null;
  secretToken: string | null;
  expiration: string | null;
  updatedAt: string;
};

export type CalendarWatchRegistration = {
  calendarId: string;
  webhookUrl: string;
  channelId: string;
  resourceId: string;
  syncToken: string | null;
  secretToken: string;
  expiration: string | null;
};

type WebhookAction =
  | { kind: "skip"; reason: string }
  | { kind: "cancelled"; bookingId: string; emailPayload: CancellationPayload | null }
  | { kind: "rescheduled"; bookingId: string; emailPayload: ReschedulePayload | null };

type CancellationPayload = {
  to: string;
  customerName: string;
  serviceName: string;
  startTime: string;
};

type ReschedulePayload = {
  to: string;
  customerName: string;
  serviceName: string;
  oldStartTime: string;
  newStartTime: string;
};

type BookingRecord = {
  id: string;
  status?: string;
  client_email?: string | null;
  client_name?: string | null;
  service_name?: string | null;
  service_id?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  googleEventId?: string | null;
  lastWebhookProcessedTime?: string | null;
  calendarSync?: {
    lastMarker?: string | null;
    lastNotificationMarker?: string | null;
    lastAction?: string | null;
    lastProcessedAt?: string | null;
    lastNotificationAt?: string | null;
  };
  [key: string]: unknown;
};

function getSettingsRef() {
  return db.collection(SETTINGS_DOC_PATH[0]).doc(SETTINGS_DOC_PATH[1]);
}

function getLockRef() {
  return db.collection(LOCK_DOC_PATH[0]).doc(LOCK_DOC_PATH[1]);
}

function getWatchBaseUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required to register the Google Calendar webhook.");
  }

  return siteUrl.replace(/\/$/, "");
}

function getCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID?.trim() || "primary";
}

function toIso(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(numeric)) {
    return new Date(numeric).toISOString();
  }
  return null;
}

function buildEventMarker(event: calendar_v3.Schema$Event): string {
  const start = event.start?.dateTime || event.start?.date || "";
  const end = event.end?.dateTime || event.end?.date || "";
  return [event.id || "", event.updated || event.etag || "", event.status || "", start, end].join("|");
}

function eventToDateTime(event: calendar_v3.Schema$Event): { start: dayjs.Dayjs | null; end: dayjs.Dayjs | null; allDay: boolean } {
  if (event.start?.dateTime && event.end?.dateTime) {
    return {
      start: dayjs(event.start.dateTime).tz(TZ),
      end: dayjs(event.end.dateTime).tz(TZ),
      allDay: false,
    };
  }

  if (event.start?.date && event.end?.date) {
    return {
      start: dayjs.tz(event.start.date, TZ).startOf("day"),
      end: dayjs.tz(event.end.date, TZ).startOf("day"),
      allDay: true,
    };
  }

  return { start: null, end: null, allDay: false };
}

function bookingToDateTime(booking: BookingRecord): { start: dayjs.Dayjs | null; end: dayjs.Dayjs | null } {
  if (!booking.date || !booking.start_time || !booking.end_time) {
    return { start: null, end: null };
  }

  const start = dayjs.tz(`${booking.date} ${booking.start_time}`, "YYYY-MM-DD HH:mm", TZ);
  const end = dayjs.tz(`${booking.date} ${booking.end_time}`, "YYYY-MM-DD HH:mm", TZ);
  return { start, end };
}

function getServiceName(booking: BookingRecord): string {
  return (booking.service_name || booking.service_id || "Servicio").toString();
}

function getCustomerName(booking: BookingRecord): string {
  return (booking.client_name || "Cliente").toString();
}

export function readCalendarWatchConfig(data: FirestoreDocData | undefined): CalendarWatchConfig | null {
  if (!data) return null;

  const nested = (data[WATCH_FIELD] as Record<string, unknown> | undefined) || {};
  const calendarId = String(nested.calendarId || data.google_calendar_id || getCalendarId());
  const webhookUrl = String(nested.webhookUrl || data.google_calendar_webhook_url || `${getWatchBaseUrl()}/api/webhooks/calendar`);
  const channelId = String(nested.channelId || data.google_calendar_watch_channel_id || "");
  const resourceId = String(nested.resourceId || data.google_calendar_watch_resource_id || "");
  const syncToken = String(nested.syncToken || data.google_calendar_watch_sync_token || "") || null;
  const secretToken = String(nested.secretToken || data.google_calendar_watch_secret_token || "") || null;
  const expiration = String(nested.expiration || data.google_calendar_watch_expiration || "") || null;
  const updatedAt = String(nested.updatedAt || data.google_calendar_watch_updated_at || new Date().toISOString());

  if (!channelId || !resourceId) return null;

  return {
    calendarId,
    webhookUrl,
    channelId,
    resourceId,
    syncToken,
    secretToken,
    expiration,
    updatedAt,
  };
}

async function saveWatchConfig(config: CalendarWatchConfig): Promise<void> {
  await getSettingsRef().set(
    {
      [WATCH_FIELD]: config,
      google_calendar_id: config.calendarId,
      google_calendar_webhook_url: config.webhookUrl,
      google_calendar_watch_channel_id: config.channelId,
      google_calendar_watch_resource_id: config.resourceId,
      google_calendar_watch_sync_token: config.syncToken,
      google_calendar_watch_secret_token: config.secretToken,
      google_calendar_watch_expiration: config.expiration,
      google_calendar_watch_updated_at: config.updatedAt,
    },
    { merge: true }
  );
}

async function bootstrapSyncToken(calendarId: string): Promise<string | null> {
  const calendar = await getGoogleCalendarClient();
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    const response = await calendar.events.list({
      calendarId,
      showDeleted: true,
      singleEvents: true,
      maxResults: 2500,
      pageToken,
    });

    nextSyncToken = response.data.nextSyncToken || nextSyncToken;
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return nextSyncToken;
}

async function fetchIncrementalEvents(calendarId: string, syncToken: string | null): Promise<{ events: calendar_v3.Schema$Event[]; nextSyncToken: string | null }> {
  const calendar = await getGoogleCalendarClient();
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;
  const events: calendar_v3.Schema$Event[] = [];

  do {
    const response = await calendar.events.list({
      calendarId,
      showDeleted: true,
      singleEvents: true,
      maxResults: 2500,
      pageToken,
      syncToken: syncToken || undefined,
    });

    events.push(...(response.data.items || []));
    nextSyncToken = response.data.nextSyncToken || nextSyncToken;
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return { events, nextSyncToken };
}

async function fetchEventsWithFallback(calendarId: string, syncToken: string | null): Promise<{ events: calendar_v3.Schema$Event[]; nextSyncToken: string | null; usedFallback: boolean }> {
  try {
    const result = await fetchIncrementalEvents(calendarId, syncToken);
    return { ...result, usedFallback: false };
  } catch (error) {
    const status = typeof error === "object" && error && "code" in error ? Number((error as { code?: unknown }).code) : null;
    if (status !== 410) {
      throw error;
    }

    const bootstrapResult = await fetchIncrementalEvents(calendarId, null);
    return { ...bootstrapResult, usedFallback: true };
  }
}

async function acquireProcessingLock(lockKey: string): Promise<boolean> {
  const lockRef = getLockRef();
  const now = Date.now();
  let acquired = false;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(lockRef);
    const existing = snapshot.data() as { lockKey?: string; expiresAt?: number } | undefined;

    if (existing?.expiresAt && existing.expiresAt > now) {
      acquired = false;
      return;
    }

    transaction.set(lockRef, {
      lockKey,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: now + LOCK_TTL_MS,
    });
    acquired = true;
  });

  return acquired;
}

async function syncBookingFromEvent(event: calendar_v3.Schema$Event): Promise<WebhookAction> {
  if (!event.id) {
    return { kind: "skip", reason: "missing_event_id" };
  }

  const bookingQuery = await db.collection("bookings").where("googleEventId", "==", event.id).limit(1).get();
  if (bookingQuery.empty) {
    return { kind: "skip", reason: "booking_not_found" };
  }

  const bookingRef = bookingQuery.docs[0]!.ref;
  const booking = bookingQuery.docs[0]!.data() as BookingRecord;
  const marker = buildEventMarker(event);
  const nowIso = new Date().toISOString();
  const eventDateTime = eventToDateTime(event);
  const bookingDateTime = bookingToDateTime(booking);
  const syncMeta = booking.calendarSync || {};

  if (syncMeta.lastMarker === marker) {
    return { kind: "skip", reason: "duplicate_marker" };
  }

  if ((booking.status || "").toLowerCase() === "cancelled" && event.status !== "cancelled") {
    await bookingRef.set(
      {
        lastWebhookProcessedTime: nowIso,
        calendarSync: {
          ...syncMeta,
          lastMarker: marker,
          lastAction: "skip",
          lastProcessedAt: nowIso,
        },
      },
      { merge: true }
    );

    return { kind: "skip", reason: "booking_already_cancelled" };
  }

  if (event.status === "cancelled") {
    if ((booking.status || "").toLowerCase() === "cancelled") {
      await bookingRef.set(
        {
          lastWebhookProcessedTime: nowIso,
          calendarSync: {
            ...syncMeta,
            lastMarker: marker,
            lastAction: "cancelled",
            lastProcessedAt: nowIso,
          },
        },
        { merge: true }
      );

      return { kind: "skip", reason: "already_cancelled" };
    }

    const emailPayload = booking.client_email
      ? {
          to: booking.client_email,
          customerName: getCustomerName(booking),
          serviceName: getServiceName(booking),
          startTime: bookingDateTime.start?.toISOString() || event.start?.dateTime || event.start?.date || new Date().toISOString(),
        }
      : null;

    await bookingRef.set(
      {
        status: "cancelled",
        canceledAt: nowIso,
        lastWebhookProcessedTime: nowIso,
        calendarSync: {
          ...syncMeta,
          lastMarker: marker,
          lastAction: "cancelled",
          lastProcessedAt: nowIso,
          lastNotificationMarker: marker,
          lastNotificationAt: nowIso,
        },
      },
      { merge: true }
    );

    return { kind: "cancelled", bookingId: booking.id, emailPayload };
  }

  if (!eventDateTime.start || !eventDateTime.end || eventDateTime.allDay) {
    await bookingRef.set(
      {
        lastWebhookProcessedTime: nowIso,
        calendarSync: {
          ...syncMeta,
          lastMarker: marker,
          lastAction: "skip",
          lastProcessedAt: nowIso,
        },
      },
      { merge: true }
    );

    return { kind: "skip", reason: "non_timed_event" };
  }

  const sameStart = bookingDateTime.start?.valueOf() === eventDateTime.start.valueOf();
  const sameEnd = bookingDateTime.end?.valueOf() === eventDateTime.end.valueOf();

  if (sameStart && sameEnd) {
    await bookingRef.set(
      {
        lastWebhookProcessedTime: nowIso,
        calendarSync: {
          ...syncMeta,
          lastMarker: marker,
          lastAction: "noop",
          lastProcessedAt: nowIso,
        },
      },
      { merge: true }
    );

    return { kind: "skip", reason: "same_schedule" };
  }

  const newDate = eventDateTime.start.format("YYYY-MM-DD");
  const newStartTime = eventDateTime.start.format("HH:mm");
  const newEndTime = eventDateTime.end.format("HH:mm");

  const emailPayload = booking.client_email
    ? {
        to: booking.client_email,
        customerName: getCustomerName(booking),
        serviceName: getServiceName(booking),
        oldStartTime: bookingDateTime.start?.toISOString() || eventDateTime.start.toISOString(),
        newStartTime: eventDateTime.start.toISOString(),
      }
    : null;

  await bookingRef.set(
    {
      date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
      status: (booking.status || "confirmed").toLowerCase() === "cancelled" ? booking.status : "confirmed",
      lastWebhookProcessedTime: nowIso,
      calendarSync: {
        ...syncMeta,
        lastMarker: marker,
        lastAction: "rescheduled",
        lastProcessedAt: nowIso,
        lastNotificationMarker: marker,
        lastNotificationAt: nowIso,
      },
    },
    { merge: true }
  );

  return { kind: "rescheduled", bookingId: booking.id, emailPayload };
}

export async function registerCalendarWatch(options: { adminEmail?: string | null; calendarId?: string; webhookUrl?: string; existingSyncToken?: string | null }): Promise<CalendarWatchRegistration> {
  const calendar = await getGoogleCalendarClient();
  const calendarId = options.calendarId?.trim() || getCalendarId();
  const webhookUrl = options.webhookUrl?.trim() || `${getWatchBaseUrl()}/api/webhooks/calendar`; 
  const existingConfig = readCalendarWatchConfig((await getSettingsRef().get()).data() as FirestoreDocData | undefined);
  const secretToken = randomUUID();

  let syncToken = options.existingSyncToken ?? existingConfig?.syncToken ?? null;
  if (!syncToken) {
    syncToken = await bootstrapSyncToken(calendarId);
  }

  if (existingConfig?.channelId && existingConfig?.resourceId) {
    try {
      await calendar.channels.stop({
        requestBody: {
          id: existingConfig.channelId,
          resourceId: existingConfig.resourceId,
        },
      });
    } catch (error) {
      console.warn("Previous Google Calendar channel could not be stopped cleanly.", error);
    }
  }

  const channelId = randomUUID();
  const watchResponse = await calendar.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: webhookUrl,
      token: secretToken,
    },
  });

  const resourceId = String(watchResponse.data.resourceId || "");
  const expiration = toIso(watchResponse.data.expiration ?? null);

  if (!resourceId) {
    throw new Error("Google Calendar did not return a resourceId for the watch channel.");
  }

  await saveWatchConfig({
    calendarId,
    webhookUrl,
    channelId,
    resourceId,
    syncToken,
    secretToken,
    expiration,
    updatedAt: new Date().toISOString(),
  });

  return {
    calendarId,
    webhookUrl,
    channelId,
    resourceId,
    syncToken,
    secretToken,
    expiration,
  };
}

export async function processCalendarWebhook(request: Request): Promise<{ ok: true; skipped?: boolean; reason?: string }> {
  const channelId = request.headers.get("X-Goog-Channel-ID");
  const resourceId = request.headers.get("X-Goog-Resource-ID");
  const resourceState = request.headers.get("X-Goog-Resource-State");
  const channelToken = request.headers.get("X-Goog-Channel-Token");
  const messageNumber = request.headers.get("X-Goog-Message-Number") || undefined;

  if (!channelId || !resourceId || !resourceState) {
    throw new Error("Missing Google webhook headers.");
  }

  if (!["sync", "exists", "not_exists"].includes(resourceState)) {
    throw new Error("Unsupported Google webhook resource state.");
  }

  const settingsSnap = await getSettingsRef().get();
  const watchConfig = readCalendarWatchConfig(settingsSnap.data() as FirestoreDocData | undefined);

  if (!watchConfig) {
    throw new Error("Calendar webhook is not configured.");
  }

  if (channelId !== watchConfig.channelId || resourceId !== watchConfig.resourceId) {
    throw new Error("Google webhook channel mismatch.");
  }

  if (watchConfig.secretToken && channelToken !== watchConfig.secretToken) {
    throw new Error("Google webhook token mismatch.");
  }

  await saveWatchConfig({
    ...watchConfig,
    updatedAt: new Date().toISOString(),
  });

  if (resourceState === "sync") {
    return { ok: true, skipped: true, reason: "sync_handshake" };
  }

  const lockKey = [channelId, resourceId, resourceState, messageNumber || ""].join(":");
  const lockAcquired = await acquireProcessingLock(lockKey);

  if (!lockAcquired) {
    return { ok: true, skipped: true, reason: "lock_busy" };
  }

  const syncResult = await fetchEventsWithFallback(watchConfig.calendarId, watchConfig.syncToken);
  const nextSyncToken = syncResult.nextSyncToken || watchConfig.syncToken;

  for (const event of syncResult.events) {
    try {
      const action = await syncBookingFromEvent(event);

      if (action.kind === "cancelled" && action.emailPayload) {
        try {
          await sendCancellationEmail(action.emailPayload);
        } catch (error) {
          console.error("Cancellation email failed after calendar webhook update.", error);
        }
      }

      if (action.kind === "rescheduled" && action.emailPayload) {
        try {
          await sendRescheduleEmail(action.emailPayload);
        } catch (error) {
          console.error("Reschedule email failed after calendar webhook update.", error);
        }
      }
    } catch (error) {
      console.error("Failed to reconcile Google Calendar event.", error);
    }
  }

  await saveWatchConfig({
    ...watchConfig,
    syncToken: nextSyncToken,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true };
}
