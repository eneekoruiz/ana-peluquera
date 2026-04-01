import { google } from "googleapis";
import { readFileSync } from "fs"; 
import path from "path"; 

// 🚀 TIPOS INCLUIDOS AQUÍ PARA QUE NO FALLE
export interface CalendarDateRange { start: Date; end: Date; }
export interface BusyInterval { start: Date; end: Date; sourceEventId?: string; }
export interface CreateAppointmentRequest {
  start: Date; 
  end: Date; 
  serviceId: string; 
  bookingId: string; 
  notes?: string; 
  timeZone?: string;
  phase1Min?: number; 
  phase2Min?: number; 
  phase3Min?: number;
}

const SYSTEM_MARKER = "ag-beauty-salon";

let calendarClient: ReturnType<typeof google.calendar> | null = null;
let jwtClient: any | null = null;

function getGoogleCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

function getGoogleAuthClient(): any {
  if (jwtClient) return jwtClient;

  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;

  if (!jsonPath) {
    throw new Error("Falta GOOGLE_SERVICE_ACCOUNT_PATH en el .env.local");
  }

  try {
    const absolutePath = path.resolve(process.cwd(), jsonPath);
    const fileContents = readFileSync(absolutePath, "utf8");
    const creds = JSON.parse(fileContents);

    jwtClient = new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    return jwtClient;
  } catch (error) {
    console.error("❌ Error cargando las credenciales de Google:", error);
    throw new Error("No se pudo leer el archivo JSON de Google Calendar.");
  }
}

function getCalendar(): ReturnType<typeof google.calendar> {
  if (calendarClient) return calendarClient;

  const auth = getGoogleAuthClient();
  calendarClient = google.calendar({ version: "v3", auth });
  return calendarClient;
}

function toDateTime(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function mergeIntervals(intervals: BusyInterval[]): BusyInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: BusyInterval[] = [];
  for (const cur of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(cur);
      continue;
    }

    if (cur.start.getTime() <= last.end.getTime()) {
      last.end = new Date(Math.max(last.end.getTime(), cur.end.getTime()));
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

function isOurAppointment(event: any) {
  const priv = event?.extendedProperties?.private;
  return priv?.system === SYSTEM_MARKER;
}

function getSandwichPhaseMinutesFromEvent(event: any): {
  phase1Min: number | null;
  phase2Min: number | null;
  phase3Min: number | null;
} {
  const priv = event?.extendedProperties?.private ?? {};

  const phase1Min = priv.phase1Min ? Number(priv.phase1Min) : null;
  const phase2Min = priv.phase2Min ? Number(priv.phase2Min) : null;
  const phase3Min = priv.phase3Min ? Number(priv.phase3Min) : null;

  if (
    Number.isFinite(phase1Min) &&
    Number.isFinite(phase2Min) &&
    Number.isFinite(phase3Min)
  ) {
    return { phase1Min, phase2Min, phase3Min };
  }

  return { phase1Min: null, phase2Min: null, phase3Min: null };
}

export async function getBusySlots(dateRange: CalendarDateRange): Promise<{
  busy: BusyInterval[];
}> {
  const calendar = getCalendar();
  const calendarId = getGoogleCalendarId();

  const timeMin = dateRange.start.toISOString();
  const timeMax = dateRange.end.toISOString();

  const res = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });

  const items = res.data.items ?? [];
  const busyIntervals: BusyInterval[] = [];

  for (const event of items) {
    if (!event.start || !event.end) continue;
    const start = toDateTime((event.start as any).dateTime ?? (event.start as any).date);
    const end = toDateTime((event.end as any).dateTime ?? (event.end as any).date);
    if (!start || !end) continue;

    if (!isOurAppointment(event)) {
      busyIntervals.push({ start, end, sourceEventId: event.id ?? undefined });
      continue;
    }

    const phaseMinutes = getSandwichPhaseMinutesFromEvent(event);
    if (!phaseMinutes.phase1Min || !phaseMinutes.phase3Min) {
      busyIntervals.push({ start, end, sourceEventId: event.id ?? undefined });
      continue;
    }

    const phase1Min = phaseMinutes.phase1Min;
    const phase3Min = phaseMinutes.phase3Min;

    const phase1End = new Date(start.getTime() + phase1Min * 60_000);
    const phase3Start = new Date(end.getTime() - phase3Min * 60_000);

    if (phase1End.getTime() >= phase3Start.getTime()) {
      busyIntervals.push({ start, end, sourceEventId: event.id ?? undefined });
      continue;
    }

    busyIntervals.push({ start, end: phase1End, sourceEventId: event.id ?? undefined });
    busyIntervals.push({ start: phase3Start, end, sourceEventId: event.id ?? undefined });
  }

  return { busy: mergeIntervals(busyIntervals) };
}

export async function createAppointment(req: CreateAppointmentRequest & { customerName?: string }): Promise<{
  eventId: string;
  htmlLink?: string;
}> {
  const calendar = getCalendar();
  const calendarId = getGoogleCalendarId();

  const timeZone = req.timeZone || process.env.GOOGLE_CALENDAR_TIME_ZONE || "Europe/Madrid";

  const start = req.start.toISOString();
  const end = req.end.toISOString();

  const phase1Min = req.phase1Min != null ? String(req.phase1Min) : "";
  const phase2Min = req.phase2Min != null ? String(req.phase2Min) : "";
  const phase3Min = req.phase3Min != null ? String(req.phase3Min) : "";

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `${req.serviceId.toUpperCase()} - ${req.customerName || 'Cita Web'}`,
      description: req.notes || "",
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
      extendedProperties: {
        private: {
          system: SYSTEM_MARKER,
          bookingId: req.bookingId,
          serviceId: req.serviceId,
          phase1Min,
          phase2Min,
          phase3Min,
        },
      },
    },
  });

  if (!event.data.id) {
    throw new Error("Google Calendar did not return an event id.");
  }

  return { eventId: event.data.id, htmlLink: event.data.htmlLink ?? undefined };
}

export async function cancelAppointment(eventId: string): Promise<void> {
  const calendar = getCalendar();
  const calendarId = getGoogleCalendarId();
  await calendar.events.delete({ calendarId, eventId });
}