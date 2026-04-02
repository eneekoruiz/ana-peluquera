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
export interface Worker { id: string; name: string; daysOfWeek: number[]; skills: string[]; }
export interface VacationRange { start: string; end: string; }
export interface AdminSettings { workers: Worker[]; bookingsEnabled: boolean; todayClosed: boolean; todayClosedDate: string | null; vacationRanges: VacationRange[]; }

let calendarClient: ReturnType<typeof google.calendar> | null = null;
let jwtClient: any | null = null;

async function getAdminSettings(): Promise<AdminSettings> {
  const defaultSettings: AdminSettings = { workers: [{ id: "ana_id", name: "Ana (Responsable)", daysOfWeek: [1, 2, 3, 4, 5, 6], skills: ["peluqueria", "masajes"] }], bookingsEnabled: true, todayClosed: false, todayClosedDate: null, vacationRanges: [] };
  try {
    const docRef = await db.collection("admin").doc("settings").get();
    if (!docRef.exists) return defaultSettings;
    const data = docRef.data() || {};
    const workers = (data.staff || []).map((w: any) => ({ id: w.id, name: w.name || "Sin Nombre", daysOfWeek: w.workingDays || [], skills: w.skills || [] }));
    return { workers: workers.length > 0 ? workers : defaultSettings.workers, bookingsEnabled: data.bookings_enabled !== false, todayClosed: !!data.today_closed, todayClosedDate: data.today_closed_date || null, vacationRanges: data.vacation_ranges || [] };
  } catch (error) { return defaultSettings; }
}

function getGoogleCalendarId(): string { return process.env.GOOGLE_CALENDAR_ID || "primary"; }

function getGoogleAuthClient(): any {
  if (jwtClient) return jwtClient;
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonPath) throw new Error("Falta configuración de credenciales de Google.");
  try {
      let creds = jsonPath.trim().startsWith('{') ? JSON.parse(jsonPath) : JSON.parse(readFileSync(path.resolve(process.cwd(), jsonPath), "utf8"));
      jwtClient = new google.auth.GoogleAuth({ credentials: { client_email: creds.client_email, private_key: creds.private_key }, scopes: ["https://www.googleapis.com/auth/calendar"] });
      return jwtClient;
  } catch (error) { throw new Error("Error leyendo JSON de Google."); }
}

function getCalendar(): ReturnType<typeof google.calendar> {
  if (calendarClient) return calendarClient;
  calendarClient = google.calendar({ version: "v3", auth: getGoogleAuthClient() });
  return calendarClient;
}

// 🚀 Lector Inteligente: Distingue "Todo el día" (Vacaciones/Cierre) de horas sueltas
function parseGoogleEvent(startObj: any, endObj: any): { start: dayjs.Dayjs, end: dayjs.Dayjs } | null {
  if (!startObj && !endObj) return null;

  if (startObj?.date && endObj?.date) {
    return {
      start: dayjs.tz(startObj.date, TZ).startOf('day'),
      end: dayjs.tz(endObj.date, TZ).subtract(1, 'day').endOf('day') 
    };
  }

  if (startObj?.dateTime && endObj?.dateTime) {
    return {
      start: dayjs(startObj.dateTime).tz(TZ),
      end: dayjs(endObj.dateTime).tz(TZ)
    };
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
    events.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        if (a.type === 'end' && b.type === 'start') return -1;
        if (a.type === 'start' && b.type === 'end') return 1;
        return 0;
    });

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
        const next = busyPeriods[i];
        if (current.end.valueOf() >= next.start.valueOf()) {
            current.end = current.end.valueOf() > next.end.valueOf() ? current.end : next.end;
        } else { merged.push(current); current = next; }
    }
    merged.push(current);
    return merged;
}

function isOurAppointment(event: any) { return event?.extendedProperties?.private?.system === SYSTEM_MARKER; }

export async function getBusySlots(dateRange: CalendarDateRange): Promise<{ busy: BusyInterval[] }> {
  const calendar = getCalendar(); const calendarId = getGoogleCalendarId();
  const settings = await getAdminSettings();
  const intervalsByDay: Record<string, BusyInterval[]> = {};
  
  let curr = dayjs(dateRange.start).tz(TZ).startOf('day');
  const limit = dayjs(dateRange.end).tz(TZ).endOf('day');
  
  while (curr.isSameOrBefore(limit)) {
    intervalsByDay[curr.format('YYYY-MM-DD')] = [];
    curr = curr.add(1, 'day');
  }

  const res = await calendar.events.list({
    calendarId, timeMin: dayjs(dateRange.start).toISOString(), timeMax: dayjs(dateRange.end).toISOString(), singleEvents: true, orderBy: "startTime", maxResults: 2500 
  });

  for (const event of res.data.items ?? []) {
    const parsed = parseGoogleEvent(event.start, event.end);
    if (!parsed) continue;

    const dateKey = parsed.start.format('YYYY-MM-DD');
    if (!intervalsByDay[dateKey]) intervalsByDay[dateKey] = [];

    if (!isOurAppointment(event)) {
      intervalsByDay[dateKey].push({ start: parsed.start, end: parsed.end, sourceEventId: event.id ?? undefined });
      continue;
    }

    const priv = event?.extendedProperties?.private ?? {};
    const p1 = priv.phase1Min ? Number(priv.phase1Min) : null;
    const p3 = priv.phase3Min ? Number(priv.phase3Min) : null;

    if (!p1 || !p3) {
      intervalsByDay[dateKey].push({ start: parsed.start, end: parsed.end, sourceEventId: event.id ?? undefined });
      continue;
    }

    const phase1End = parsed.start.add(p1, 'minute');
    const phase3Start = parsed.end.subtract(p3, 'minute');

    if (phase1End.valueOf() >= phase3Start.valueOf()) {
      intervalsByDay[dateKey].push({ start: parsed.start, end: parsed.end, sourceEventId: event.id ?? undefined });
      continue;
    }
    intervalsByDay[dateKey].push({ start: parsed.start, end: phase1End, sourceEventId: event.id ?? undefined });
    intervalsByDay[dateKey].push({ start: phase3Start, end: parsed.end, sourceEventId: event.id ?? undefined });
  }

  let finalBusyIntervals: BusyInterval[] = [];

  for (const [dateString, intervals] of Object.entries(intervalsByDay)) {
      const currentDay = dayjs.tz(dateString, TZ);
      
      // Mantenemos esto por si tienes cierres configurados antiguos, pero manda Google
      const isClosedManual = settings.todayClosed && settings.todayClosedDate === dateString;
      const isVacationManual = settings.vacationRanges.some(r => dateString >= r.start && dateString <= r.end);
      
      if (!settings.bookingsEnabled || isClosedManual || isVacationManual) {
          finalBusyIntervals.push({ start: currentDay.startOf('day'), end: currentDay.endOf('day'), sourceEventId: "closed_by_admin" });
          continue;
      }

      const workersToday = settings.workers.filter(w => w.daysOfWeek.includes(currentDay.day())).length;
      if (workersToday === 0) {
          finalBusyIntervals.push({ start: currentDay.startOf('day'), end: currentDay.endOf('day'), sourceEventId: "no_workers" });
          continue;
      }
      
      finalBusyIntervals.push(...getOverlappingIntervals(intervals, workersToday));
  }
  return { busy: finalBusyIntervals };
}

export async function createAppointment(req: CreateAppointmentRequest & { customerName?: string }): Promise<{ eventId: string; htmlLink?: string; }> {
  const calendar = getCalendar(); const calendarId = getGoogleCalendarId();
  
  const startDayjs = dayjs(req.start).tz(TZ);
  const endDayjs = dayjs(req.end).tz(TZ);
  
  const settings = await getAdminSettings();
  const dayOfWeek = startDayjs.day();
  const workersToday = settings.workers.filter(w => w.daysOfWeek.includes(dayOfWeek));

  const existingEvents = await calendar.events.list({ calendarId, timeMin: startDayjs.toISOString(), timeMax: endDayjs.toISOString(), singleEvents: true });
  const busyWorkerNames = (existingEvents.data.items || []).map(event => event.extendedProperties?.private?.workerName).filter(Boolean);
  const freeWorker = workersToday.find(w => !busyWorkerNames.includes(w.name)) || workersToday[0];
  const assignedTo = freeWorker ? freeWorker.name : "Ana";

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `[${assignedTo}] ${req.serviceId.toUpperCase()} - ${req.customerName || 'Cita'}`, description: req.notes || "",
      start: { dateTime: startDayjs.format(), timeZone: TZ }, 
      end: { dateTime: endDayjs.format(), timeZone: TZ },
      extendedProperties: { private: { system: SYSTEM_MARKER, bookingId: req.bookingId, serviceId: req.serviceId, workerName: assignedTo, phase1Min: req.phase1Min != null ? String(req.phase1Min) : "", phase2Min: req.phase2Min != null ? String(req.phase2Min) : "", phase3Min: req.phase3Min != null ? String(req.phase3Min) : "" } },
    },
  });
  if (!event.data.id) throw new Error("Error creando el evento en Google Calendar.");
  return { eventId: event.data.id, htmlLink: event.data.htmlLink ?? undefined };
}

export async function cancelAppointment(eventId: string): Promise<void> {
  await getCalendar().events.delete({ calendarId: getGoogleCalendarId(), eventId });
}