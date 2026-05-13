import { google } from "googleapis";
import { getDb } from "./firebaseAdmin"; 
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getOverlappingIntervals } from "@ana-peluquera/scheduler";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Europe/Madrid"; 
const SYSTEM_MARKER = "ag-beauty-salon";

export interface CalendarDateRange { start: Date | string; end: Date | string; }
export interface BusyInterval { start: dayjs.Dayjs; end: dayjs.Dayjs; sourceEventId?: string; isAppointment?: boolean; isTotalBlock?: boolean; }
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
  customerName?: string;
  customerPhone?: string;
}
export interface Worker { id: string; name: string; daysOfWeek: number[]; skills: string[]; schedule?: any[]; }
export interface VacationRange { start: string; end: string; }
export interface AdminSettings { workers: Worker[]; bookingsEnabled: boolean; todayClosed: boolean; todayClosedDate: string | null; vacationRanges: VacationRange[]; google_refresh_token?: string; }

// 🚀 NUEVO SISTEMA OAUTH2 (SaaS Permanente)
async function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Leemos la llave maestra de Ana desde Firebase
  const doc = await getDb().collection("settings").doc("admin").get();
  const data = doc.data();
  const refreshToken = data?.google_refresh_token;

  if (!refreshToken) {
    const err: any = new Error("CALENDAR_DISCONNECTED");
    err.code = "MISSING_REFRESH_TOKEN";
    throw err;
  }

  // Le damos la llave al cliente de Google para que actúe en nombre de Ana
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

// 🚀 Ahora obtener el calendario es una función asíncrona
async function getCalendar() {
  try {
    const auth = await getOAuth2Client();
    return google.calendar({ version: "v3", auth });
  } catch (error: any) {
    if (error.message === "CALENDAR_DISCONNECTED") throw error;
    console.error("Error al inicializar cliente de calendario:", error);
    throw new Error("CALENDAR_DISCONNECTED");
  }
}

/**
 * Verifica si la conexión con Google Calendar es funcional.
 * Se usa para el 'Modo Mantenimiento' preventivo.
 */
export async function checkCalendarSyncStatus() {
  try {
    const calendar = await getCalendar();
    // Intentamos una operación ligera para validar el token
    await calendar.calendarList.list({ minAccessRole: "owner", maxResults: 1 });
    return { status: "connected", message: "Google Calendar sincronizado correctamente." };
  } catch (error: any) {
    console.error("❌ Fallo en la verificación de sincronización:", error.message);
    return { status: "disconnected", error: error.message || "Unknown error" };
  }
}

export async function getGoogleCalendarClient() {
  return getCalendar();
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

export async function getBusySlots(dateRange: CalendarDateRange): Promise<{ busy: BusyInterval[], rawEventIds: string[] }> {
  // 🚀 AWAIT CRÍTICO para el nuevo sistema
  const calendar = await getCalendar();
  
  const settingsDoc = await getDb().collection("settings").doc("admin").get();
  const settingsData = settingsDoc.data() || {};
  
  const settings: AdminSettings = {
    workers: (settingsData.staff || []).map((w: any) => ({ id: w.id, name: w.name, daysOfWeek: w.workingDays || [], skills: w.skills || [], schedule: w.schedule })),
    bookingsEnabled: settingsData.bookings_enabled !== false,
    todayClosed: !!settingsData.today_closed,
    todayClosedDate: settingsData.today_closed_date || null,
    vacationRanges: settingsData.vacation_ranges || [],
    google_refresh_token: settingsData.google_refresh_token
  };

  const intervalsByDay: Record<string, BusyInterval[]> = {};
  let curr = dayjs(dateRange.start).tz(TZ).startOf('day');
  const limit = dayjs(dateRange.end).tz(TZ).endOf('day');
  
  while (curr.valueOf() <= limit.valueOf()) {
    intervalsByDay[curr.format('YYYY-MM-DD')] = [];
    curr = curr.add(1, 'day');
  }

  const res = await calendar.events.list({
    calendarId: "primary", // 🚀 Ahora usamos siempre el calendario principal del usuario logueado
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
        
        // Recortamos los eventos largos para que encajen en el día actual
        const dayStart = eventCurr.startOf('day');
        const dayEnd = eventCurr.endOf('day');
        const actualStart = parsed.start.isAfter(dayStart) ? parsed.start : dayStart;
        const actualEnd = parsed.end.isBefore(dayEnd) ? parsed.end : dayEnd;

        if (isOurAppt && priv.phase1Min && priv.phase3Min) {
            intervalsByDay[dKey].push({ start: parsed.start, end: parsed.start.add(Number(priv.phase1Min), 'minute'), isAppointment: true, isTotalBlock: false });
            intervalsByDay[dKey].push({ start: parsed.end.subtract(Number(priv.phase3Min), 'minute'), end: parsed.end, isAppointment: true, isTotalBlock: false });
        } else {
            intervalsByDay[dKey].push({ 
                start: actualStart, 
                end: actualEnd, 
                isAppointment: isAppointment, 
                sourceEventId: (event.id as string) ?? undefined,
                isTotalBlock: !isAppointment // 🚀 Si no es una CITA, bloquea a todo el mundo (Ej: Médico)
            });
        }
      }
      eventCurr = eventCurr.add(1, 'day');
    }
  }

  const finalBusy: BusyInterval[] = [];
  for (const [dateStr, intervals] of Object.entries(intervalsByDay)) {
    const day = dayjs.tz(dateStr, TZ);
    
    // Compatibilidad con el nuevo sistema de turnos
    const workers = settings.workers.filter((w) => {
      if (w.schedule) {
        const todaySched = w.schedule.find((s:any) => s.dayId === day.day());
        return todaySched && todaySched.isActive;
      }
      return w.daysOfWeek.includes(day.day());
    }).length;
    
    const isEmergencyClosed = settings.todayClosed && dateStr === settings.todayClosedDate;
    const isInVacation = settings.vacationRanges.some(range => dateStr >= range.start && dateStr <= range.end);

    if (workers === 0 || isEmergencyClosed || isInVacation) {
      finalBusy.push({ start: day.startOf('day'), end: day.endOf('day'), isAppointment: false, isTotalBlock: true });
    } else {
      finalBusy.push(...getOverlappingIntervals(intervals, workers, (val) => val.valueOf()).map(range => ({
        start: dayjs(range.start).tz(TZ),
        end: dayjs(range.end).tz(TZ),
        isAppointment: false
      })));
    }
  }
  return { busy: finalBusy, rawEventIds }; 
}

export async function createAppointment(req: CreateAppointmentRequest) {
  const calendar = await getCalendar(); // 🚀 AWAIT
  const startDayjs = dayjs(req.start).tz(TZ);
  const endDayjs = dayjs(req.end).tz(TZ);

  const event = await calendar.events.insert({
    calendarId: "primary", // 🚀 primary
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
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 30 }, // Aviso en el móvil 30 min antes
        ],
      },
    },

  });
  return { eventId: (event.data.id as string), htmlLink: (event.data.htmlLink as string) };
}

export async function cancelAppointment(eventId: string) {
  const calendar = await getCalendar(); // 🚀 AWAIT
  await calendar.events.delete({ calendarId: "primary", eventId }); // 🚀 primary
}