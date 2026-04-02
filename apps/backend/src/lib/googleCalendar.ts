import { google } from "googleapis";
import { readFileSync } from "fs"; 
import path from "path"; 
import { db } from "./firebaseAdmin"; 
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

const TZ = "Europe/Madrid"; 
const SYSTEM_MARKER = "ag-beauty-salon";

export interface CalendarDateRange { start: Date | string; end: Date | string; }
export interface BusyInterval { start: dayjs.Dayjs; end: dayjs.Dayjs; sourceEventId?: string; }
export interface CreateAppointmentRequest { start: Date | string; end: Date | string; serviceId: string; bookingId: string; notes?: string; timeZone?: string; phase1Min?: number; phase2Min?: number; phase3Min?: number; }

let calendarClient: ReturnType<typeof google.calendar> | null = null;
let jwtClient: any | null = null;

function getGoogleAuthClient() {
  if (jwtClient) return jwtClient;
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonPath) throw new Error("Faltan credenciales de Google.");
  let creds = jsonPath.trim().startsWith('{') ? JSON.parse(jsonPath) : JSON.parse(readFileSync(path.resolve(process.cwd(), jsonPath), "utf8"));
  jwtClient = new google.auth.GoogleAuth({ credentials: { client_email: creds.client_email, private_key: creds.private_key }, scopes: ["https://www.googleapis.com/auth/calendar"] });
  return jwtClient;
}

function getCalendar() {
  if (calendarClient) return calendarClient;
  calendarClient = google.calendar({ version: "v3", auth: getGoogleAuthClient() });
  return calendarClient;
}

function parseGoogleEvent(startObj: any, endObj: any): { start: dayjs.Dayjs, end: dayjs.Dayjs } | null {
  if (!startObj && !endObj) return null;
  if (startObj?.date) {
    return {
      start: dayjs.tz(startObj.date, TZ).startOf('day'),
      end: dayjs.tz(endObj.date, TZ).subtract(1, 'second') 
    };
  }
  if (startObj?.dateTime) {
    return { start: dayjs(startObj.dateTime).tz(TZ), end: dayjs(endObj.dateTime).tz(TZ) };
  }
  return null;
}

function getOverlappingIntervals(intervals: BusyInterval[], maxCapacity: number): BusyInterval[] {
    if (intervals.length === 0 || maxCapacity === 0) return [];
    const events: { time: number, type: 'start' | 'end' }[] = [];
    for (const interval of intervals) {
        events.push({ time: interval.start.valueOf(), type: 'start' });
        events.push({ time: interval.end.valueOf(), type: 'end' });
    }
    events.sort((a, b) => a.time - b.time || (a.type === 'end' ? -1 : 1));

    let active = 0; let fullPeriodStart: number | null = null; const busyPeriods: BusyInterval[] = [];
    for (const event of events) {
        if (event.type === 'start') {
            active++;
            if (active >= maxCapacity && fullPeriodStart === null) fullPeriodStart = event.time;
        } else {
            if (active >= maxCapacity && fullPeriodStart !== null && (active - 1) < maxCapacity) {
                busyPeriods.push({ start: dayjs(fullPeriodStart).tz(TZ), end: dayjs(event.time).tz(TZ) });
                fullPeriodStart = null;
            }
            active--;
        }
    }
    if (busyPeriods.length === 0) return [];
    const merged: BusyInterval[] = []; let current = busyPeriods[0];
    for (let i = 1; i < busyPeriods.length; i++) {
        if (current.end.valueOf() >= busyPeriods[i].start.valueOf()) {
            current.end = current.end.valueOf() > busyPeriods[i].end.valueOf() ? current.end : busyPeriods[i].end;
        } else { merged.push(current); current = busyPeriods[i]; }
    }
    merged.push(current); return merged;
}

export async function getBusySlots(dateRange: CalendarDateRange): Promise<{ busy: BusyInterval[] }> {
  const calendar = getCalendar();
  const settingsDoc = await db.collection("admin").doc("settings").get();
  const settings = settingsDoc.data() || {};
  const intervalsByDay: Record<string, BusyInterval[]> = {};

  let curr = dayjs(dateRange.start).tz(TZ).startOf('day');
  const limit = dayjs(dateRange.end).tz(TZ).endOf('day');
  while (curr.isSameOrBefore(limit)) {
    intervalsByDay[curr.format('YYYY-MM-DD')] = [];
    curr = curr.add(1, 'day');
  }

  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    timeMin: dayjs(dateRange.start).toISOString(),
    timeMax: dayjs(dateRange.end).toISOString(),
    singleEvents: true,
  });

  for (const event of res.data.items ?? []) {
    const parsed = parseGoogleEvent(event.start, event.end);
    if (!parsed) continue;
    const dateKey = parsed.start.format('YYYY-MM-DD');
    if (!intervalsByDay[dateKey]) continue;

    const priv = event?.extendedProperties?.private ?? {};
    if (priv.system === SYSTEM_MARKER && priv.phase1Min && priv.phase3Min) {
        intervalsByDay[dateKey].push({ start: parsed.start, end: parsed.start.add(Number(priv.phase1Min), 'm') });
        intervalsByDay[dateKey].push({ start: parsed.end.subtract(Number(priv.phase3Min), 'm'), end: parsed.end });
    } else {
        intervalsByDay[dateKey].push({ start: parsed.start, end: parsed.end });
    }
  }

  const finalBusy: BusyInterval[] = [];
  for (const [dateStr, intervals] of Object.entries(intervalsByDay)) {
    const day = dayjs.tz(dateStr, TZ);
    const workers = (settings.staff || []).filter((w: any) => w.workingDays?.includes(day.day())).length;
    if (workers === 0) {
      finalBusy.push({ start: day.startOf('day'), end: day.endOf('day') });
    } else {
      finalBusy.push(...getOverlappingIntervals(intervals, workers));
    }
  }
  return { busy: finalBusy };
}

export async function createAppointment(req: CreateAppointmentRequest) {
  const calendar = getCalendar();
  const startDayjs = dayjs(req.start).tz(TZ);
  const endDayjs = dayjs(req.end).tz(TZ);

  const event = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    requestBody: {
      summary: req.serviceId.toUpperCase(),
      description: req.notes,
      start: { dateTime: startDayjs.toISOString(), timeZone: TZ },
      end: { dateTime: endDayjs.toISOString(), timeZone: TZ },
      extendedProperties: { private: { 
        system: SYSTEM_MARKER, 
        bookingId: req.bookingId,
        phase1Min: String(req.phase1Min || ""),
        phase3Min: String(req.phase3Min || "")
      } },
    },
  });
  return { eventId: event.data.id, htmlLink: event.data.htmlLink };
}

export async function cancelAppointment(eventId: string) {
  await getCalendar().events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID || "primary", eventId });
}