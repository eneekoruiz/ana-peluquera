import { google } from "googleapis";
import { readFileSync } from "fs"; 
import path from "path"; 
import { db } from "./firebaseAdmin"; 

export interface CalendarDateRange { start: Date; end: Date; }
export interface BusyInterval { start: Date; end: Date; sourceEventId?: string; }
export interface CreateAppointmentRequest { start: Date; end: Date; serviceId: string; bookingId: string; notes?: string; timeZone?: string; phase1Min?: number; phase2Min?: number; phase3Min?: number; }
export interface Worker { id: string; name: string; daysOfWeek: number[]; skills: string[]; }
export interface VacationRange { start: string; end: string; }
export interface AdminSettings { workers: Worker[]; bookingsEnabled: boolean; todayClosed: boolean; todayClosedDate: string | null; vacationRanges: VacationRange[]; }

const SYSTEM_MARKER = "ag-beauty-salon";
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

function isDayClosed(dateString: string, settings: AdminSettings): boolean {
  if (!settings.bookingsEnabled) return true;
  if (settings.todayClosed && settings.todayClosedDate === dateString) return true;
  for (const range of settings.vacationRanges) {
    if (dateString >= range.start && dateString <= range.end) return true;
  }
  return false;
}

function getCapacityForDate(date: Date, currentWorkers: Worker[]): number {
  return currentWorkers.filter(w => w.daysOfWeek.includes(date.getDay())).length;
}

// 🚀 EL EXTRACTOR ABSOLUTO: Arrancamos la hora exacta y creamos un Fake UTC intocable
function extractLocalToFakeUTC(googleDateTime?: string, googleDate?: string): Date | null {
  if (!googleDateTime && !googleDate) return null;
  
  if (googleDate) {
    // Si Ana pone "Vacaciones" (todo el día), bloquea desde las 00:00
    return new Date(`${googleDate}T00:00:00Z`);
  }
  
  if (googleDateTime) {
    // Si pone "12:15:00+02:00", cortamos el +02:00 y nos quedamos con "12:15:00Z"
    const stripped = googleDateTime.substring(0, 19); 
    return new Date(stripped + "Z");
  }
  return null;
}

function getOverlappingIntervals(intervals: BusyInterval[], maxCapacity: number): BusyInterval[] {
    if (intervals.length === 0 || maxCapacity === 0) return [];
    const events: { time: number, type: 'start' | 'end', originalInterval: BusyInterval }[] = [];
    for (const interval of intervals) {
        events.push({ time: interval.start.getTime(), type: 'start', originalInterval: interval });
        events.push({ time: interval.end.getTime(), type: 'end', originalInterval: interval });
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
                busyPeriods.push({ start: new Date(fullPeriodStart), end: new Date(event.time) });
                fullPeriodStart = null;
            }
            active--;
        }
    }
    if (busyPeriods.length === 0) return [];
    const merged: BusyInterval[] = []; let current = busyPeriods[0];
    for (let i = 1; i < busyPeriods.length; i++) {
        const next = busyPeriods[i];
        if (current.end.getTime() >= next.start.getTime()) current.end = new Date(Math.max(current.end.getTime(), next.end.getTime()));
        else { merged.push(current); current = next; }
    }
    merged.push(current);
    return merged;
}

function isOurAppointment(event: any) { return event?.extendedProperties?.private?.system === SYSTEM_MARKER; }

function getSandwichPhaseMinutesFromEvent(event: any) {
  const priv = event?.extendedProperties?.private ?? {};
  const p1 = priv.phase1Min ? Number(priv.phase1Min) : null;
  const p2 = priv.phase2Min ? Number(priv.phase2Min) : null;
  const p3 = priv.phase3Min ? Number(priv.phase3Min) : null;
  if (Number.isFinite(p1) && Number.isFinite(p2) && Number.isFinite(p3)) return { phase1Min: p1, phase2Min: p2, phase3Min: p3 };
  return { phase1Min: null, phase2Min: null, phase3Min: null };
}

export async function getBusySlots(dateRange: CalendarDateRange): Promise<{ busy: BusyInterval[] }> {
  const calendar = getCalendar(); const calendarId = getGoogleCalendarId();
  const settings = await getAdminSettings();
  const intervalsByDay: Record<string, BusyInterval[]> = {};
  
  let curr = new Date(dateRange.start); curr.setHours(0, 0, 0, 0); const limit = new Date(dateRange.end);
  while (curr <= limit) {
    const y = curr.getFullYear(); const m = String(curr.getMonth() + 1).padStart(2, '0'); const d = String(curr.getDate()).padStart(2, '0');
    intervalsByDay[`${y}-${m}-${d}`] = [];
    curr.setDate(curr.getDate() + 1);
  }

  const res = await calendar.events.list({ calendarId, timeMin: dateRange.start.toISOString(), timeMax: dateRange.end.toISOString(), singleEvents: true, orderBy: "startTime", maxResults: 2500 });

  for (const event of res.data.items ?? []) {
    const start = extractLocalToFakeUTC((event.start as any).dateTime, (event.start as any).date);
    const end = extractLocalToFakeUTC((event.end as any).dateTime, (event.end as any).date);
    if (!start || !end) continue;

    const dateKey = start.toISOString().substring(0, 10); 
    if (!intervalsByDay[dateKey]) intervalsByDay[dateKey] = [];

    if (!isOurAppointment(event)) {
      intervalsByDay[dateKey].push({ start, end, sourceEventId: event.id ?? undefined });
      continue;
    }

    const phases = getSandwichPhaseMinutesFromEvent(event);
    if (!phases.phase1Min || !phases.phase3Min) {
      intervalsByDay[dateKey].push({ start, end, sourceEventId: event.id ?? undefined });
      continue;
    }

    const phase1End = new Date(start.getTime() + phases.phase1Min * 60_000);
    const phase3Start = new Date(end.getTime() - phases.phase3Min * 60_000);
    if (phase1End.getTime() >= phase3Start.getTime()) {
      intervalsByDay[dateKey].push({ start, end, sourceEventId: event.id ?? undefined });
      continue;
    }
    intervalsByDay[dateKey].push({ start, end: phase1End, sourceEventId: event.id ?? undefined });
    intervalsByDay[dateKey].push({ start: phase3Start, end, sourceEventId: event.id ?? undefined });
  }

  let finalBusyIntervals: BusyInterval[] = [];

  for (const [dateString, intervals] of Object.entries(intervalsByDay)) {
      const [y, m, d] = dateString.split('-').map(Number);
      const localDateForCapacity = new Date(y, m - 1, d);

      if (isDayClosed(dateString, settings)) {
          finalBusyIntervals.push({ start: new Date(`${dateString}T00:00:00Z`), end: new Date(`${dateString}T23:59:59Z`), sourceEventId: "closed" });
          continue;
      }

      const maxCapacity = getCapacityForDate(localDateForCapacity, settings.workers);
      if (maxCapacity === 0) {
          finalBusyIntervals.push({ start: new Date(`${dateString}T00:00:00Z`), end: new Date(`${dateString}T23:59:59Z`), sourceEventId: "no_workers" });
          continue;
      }
      
      finalBusyIntervals.push(...getOverlappingIntervals(intervals, maxCapacity));
  }
  return { busy: finalBusyIntervals };
}

export async function createAppointment(req: CreateAppointmentRequest & { customerName?: string }): Promise<{ eventId: string; htmlLink?: string; }> {
  const calendar = getCalendar(); const calendarId = getGoogleCalendarId();
  const timeZone = req.timeZone || process.env.GOOGLE_CALENDAR_TIME_ZONE || "Europe/Madrid";
  const startStr = req.start.toISOString().substring(0, 19); const endStr = req.end.toISOString().substring(0, 19);
  const dateString = req.start.toISOString().split('T')[0];
  const settings = await getAdminSettings();
  if (isDayClosed(dateString, settings)) throw new Error("Cerrado.");
  const dayOfWeek = req.start.getDay();
  const workersToday = settings.workers.filter(w => w.daysOfWeek.includes(dayOfWeek));
  const existingEvents = await calendar.events.list({ calendarId, timeMin: startStr, timeMax: endStr, singleEvents: true });
  const busyWorkerNames = (existingEvents.data.items || []).map(event => event.extendedProperties?.private?.workerName).filter(Boolean);
  const freeWorker = workersToday.find(w => !busyWorkerNames.includes(w.name)) || workersToday[0];
  const assignedTo = freeWorker ? freeWorker.name : "Ana";

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `[${assignedTo}] ${req.serviceId.toUpperCase()} - ${req.customerName || 'Cita'}`, description: req.notes || "",
      start: { dateTime: startStr, timeZone }, end: { dateTime: endStr, timeZone },
      extendedProperties: { private: { system: SYSTEM_MARKER, bookingId: req.bookingId, serviceId: req.serviceId, workerName: assignedTo, phase1Min: req.phase1Min != null ? String(req.phase1Min) : "", phase2Min: req.phase2Min != null ? String(req.phase2Min) : "", phase3Min: req.phase3Min != null ? String(req.phase3Min) : "" } },
    },
  });
  if (!event.data.id) throw new Error("Error en Google Calendar.");
  return { eventId: event.data.id, htmlLink: event.data.htmlLink ?? undefined };
}

export async function cancelAppointment(eventId: string): Promise<void> {
  await getCalendar().events.delete({ calendarId: getGoogleCalendarId(), eventId });
}