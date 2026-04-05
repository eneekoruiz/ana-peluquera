import { google } from "googleapis";
import { readFileSync } from "fs"; 
import path from "path"; 
import { db } from "./firebaseAdmin"; 
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Europe/Madrid"; 
const SYSTEM_MARKER = "ag-beauty-salon";

export interface CalendarDateRange { start: Date | string; end: Date | string; }
export interface BusyInterval { start: dayjs.Dayjs; end: dayjs.Dayjs; sourceEventId?: string; isAppointment?: boolean; }
export interface CreateAppointmentRequest { 
  start: Date | string; 
  end: Date | string; 
  serviceId: string; 
  bookingId: string; 
  notes?: string; 
  timeZone?: string; 
  phase1Min?: number; 
  phase2Min?: number; 
  phase3Min?: number; 
}
export interface Worker { id: string; name: string; daysOfWeek: number[]; skills: string[]; schedule?: any[]; }
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
    const workers = (data.staff || []).map((w: any) => ({ 
      id: w.id, 
      name: w.name || "Sin Nombre", 
      daysOfWeek: w.workingDays || [], 
      skills: w.skills || [],
      schedule: w.schedule // 🚀 Soporte para el nuevo sistema de turnos
    }));
    return { workers: workers.length > 0 ? workers : defaultSettings.workers, bookingsEnabled: data.bookings_enabled !== false, todayClosed: !!data.today_closed, todayClosedDate: data.today_closed_date || null, vacationRanges: data.vacation_ranges || [] };
  } catch (error) { return defaultSettings; }
}

function getGoogleCalendarId(): string { return process.env.GOOGLE_CALENDAR_ID || "primary"; }

function getGoogleAuthClient(): any {
  if (jwtClient) return jwtClient;
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonPath) throw new Error("Faltan credenciales de Google.");
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

function parseGoogleEvent(startObj: any, endObj: any): { start: dayjs.Dayjs, end: dayjs.Dayjs } | null {
  if (!startObj && !endObj) return null;
  if (startObj?.date) {
    const startD = dayjs.tz(startObj.date, TZ).startOf('day');
    const endD = endObj?.date ? dayjs.tz(endObj.date, TZ).subtract(1, 'second') : startD.endOf('day');
    return { start: startD, end: endD };
  }
  if (startObj?.dateTime && endObj?.dateTime) {
    return { start: dayjs(startObj.dateTime).tz(TZ), end: dayjs(endObj.dateTime).tz(TZ) };
  }
  return null;
}

function getOverlappingIntervals(intervals: BusyInterval[], maxCapacity: number): BusyInterval[] {
    if (intervals.length === 0 || maxCapacity === 0) return [];
    const events: { time: number, type: 'start' | 'end', isAppointment?: boolean }[] = [];
    for (const interval of intervals) {
        events.push({ time: interval.start.valueOf(), type: 'start', isAppointment: interval.isAppointment });
        events.push({ time: interval.end.valueOf(), type: 'end', isAppointment: interval.isAppointment });
    }
    events.sort((a, b) => a.time - b.time || (a.type === 'end' ? -1 : 1));

    let active = 0; let fullPeriodStart: number | null = null; const busyPeriods: BusyInterval[] = [];
    let currentIsAppt = false;

    for (const event of events) {
        if (event.type === 'start') {
            active++;
            if (active >= maxCapacity && fullPeriodStart === null) {
              fullPeriodStart = event.time;
              currentIsAppt = event.isAppointment || false;
            }
        } else {
            if (active >= maxCapacity && fullPeriodStart !== null && (active - 1) < maxCapacity) {
                busyPeriods.push({ 
                  start: dayjs(fullPeriodStart).tz(TZ), 
                  end: dayjs(event.time).tz(TZ),
                  isAppointment: currentIsAppt 
                });
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
            current.isAppointment = current.isAppointment && busyPeriods[i].isAppointment;
        } else { merged.push(current); current = busyPeriods[i]; }
    }
    merged.push(current); return merged;
}

export async function getBusySlots(dateRange: CalendarDateRange): Promise<{ busy: BusyInterval[], rawEventIds: string[] }> {
  const calendar = getCalendar();
  const settingsDoc = await db.collection("admin").doc("settings").get();
  const settingsData = settingsDoc.data() || {};
  
  const settings: AdminSettings = {
    workers: (settingsData.staff || []).map((w: any) => ({ id: w.id, name: w.name, daysOfWeek: w.workingDays || [], skills: w.skills || [], schedule: w.schedule })),
    bookingsEnabled: settingsData.bookings_enabled !== false,
    todayClosed: !!settingsData.today_closed,
    todayClosedDate: settingsData.today_closed_date || null,
    vacationRanges: settingsData.vacation_ranges || []
  };

  const intervalsByDay: Record<string, BusyInterval[]> = {};
  let curr = dayjs(dateRange.start).tz(TZ).startOf('day');
  const limit = dayjs(dateRange.end).tz(TZ).endOf('day');
  
  while (curr.valueOf() <= limit.valueOf()) {
    intervalsByDay[curr.format('YYYY-MM-DD')] = [];
    curr = curr.add(1, 'day');
  }

  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    timeMin: dayjs(dateRange.start).toISOString(),
    timeMax: dayjs(dateRange.end).toISOString(),
    singleEvents: true,
  });

  const rawEventIds: string[] = []; 

  for (const event of res.data.items ?? []) {
    if (event.id) rawEventIds.push(event.id); 

    const summary = (event.summary || "").toUpperCase();
    const isAppointment = summary.includes("CITA");

    const parsed = parseGoogleEvent(event.start, event.end);
    if (!parsed) continue;

    const priv = event?.extendedProperties?.private ?? {};
    const isOurAppt = priv.system === SYSTEM_MARKER;

    let eventCurr = parsed.start.clone().startOf('day');
    const eventEnd = parsed.end.clone().endOf('day');

    while (eventCurr.valueOf() <= eventEnd.valueOf()) {
      const dKey = eventCurr.format('YYYY-MM-DD');
      if (intervalsByDay[dKey]) {
        
        // 🚀 EL FIX MAGISTRAL: "Recortamos" los eventos largos para que encajen en el día actual
        const dayStart = eventCurr.startOf('day');
        const dayEnd = eventCurr.endOf('day');
        const actualStart = parsed.start.isAfter(dayStart) ? parsed.start : dayStart;
        const actualEnd = parsed.end.isBefore(dayEnd) ? parsed.end : dayEnd;

        if (isOurAppt && priv.phase1Min && priv.phase3Min) {
            intervalsByDay[dKey].push({ start: parsed.start, end: parsed.start.add(Number(priv.phase1Min), 'minute'), isAppointment: true });
            intervalsByDay[dKey].push({ start: parsed.end.subtract(Number(priv.phase3Min), 'minute'), end: parsed.end, isAppointment: true });
        } else {
            intervalsByDay[dKey].push({ 
                start: actualStart, 
                end: actualEnd, 
                isAppointment: isAppointment, 
                sourceEventId: (event.id as string) ?? undefined 
            });
        }
      }
      eventCurr = eventCurr.add(1, 'day');
    }
  }

  const finalBusy: BusyInterval[] = [];
  for (const [dateStr, intervals] of Object.entries(intervalsByDay)) {
    const day = dayjs.tz(dateStr, TZ);
    
    // 🚀 FIX: Compatibilidad con el nuevo sistema de turnos
    const workers = settings.workers.filter((w) => {
      if (w.schedule) {
        const todaySched = w.schedule.find((s:any) => s.dayId === day.day());
        return todaySched && todaySched.isActive;
      }
      return w.daysOfWeek.includes(day.day());
    }).length;
    
    if (workers === 0) {
      finalBusy.push({ start: day.startOf('day'), end: day.endOf('day'), isAppointment: false });
    } else {
      finalBusy.push(...getOverlappingIntervals(intervals, workers));
    }
  }
  return { busy: finalBusy, rawEventIds }; 
}

export async function createAppointment(req: CreateAppointmentRequest & { customerName?: string, customerPhone?: string }) {
  const calendar = getCalendar();
  const startDayjs = dayjs(req.start).tz(TZ);
  const endDayjs = dayjs(req.end).tz(TZ);

  const event = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    requestBody: {
      summary: `[WEB] CITA ${req.serviceId.toUpperCase()} - ${req.customerName || 'Cliente'}`,
      description: req.notes || "",
      start: { dateTime: startDayjs.format(), timeZone: TZ },
      end: { dateTime: endDayjs.format(), timeZone: TZ },
      extendedProperties: { private: { 
        system: SYSTEM_MARKER, 
        bookingId: req.bookingId,
        phase1Min: String(req.phase1Min || ""),
        phase3Min: String(req.phase3Min || "")
      } },
    },
  });
  return { eventId: (event.data.id as string), htmlLink: (event.data.htmlLink as string) };
}

export async function cancelAppointment(eventId: string) {
  await getCalendar().events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID || "primary", eventId });
}