import { google } from "googleapis";
import { readFileSync } from "fs"; 
import path from "path"; 
// 👇 Importamos Firebase Admin (Asegúrate de que la ruta sea correcta)
import { db } from "./firebaseAdmin"; 

// --- TIPOS E INTERFACES ---
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

export interface Worker {
  id: string;
  name: string;
  daysOfWeek: number[]; 
  skills: string[];     
}

export interface VacationRange {
  start: string; // "YYYY-MM-DD"
  end: string;   // "YYYY-MM-DD"
}

// Interfaz para englobar toda la configuración del documento admin/settings
export interface AdminSettings {
  workers: Worker[];
  bookingsEnabled: boolean;
  todayClosed: boolean;
  todayClosedDate: string | null;
  vacationRanges: VacationRange[];
}

const SYSTEM_MARKER = "ag-beauty-salon";

let calendarClient: ReturnType<typeof google.calendar> | null = null;
let jwtClient: any | null = null;

// --- 📡 OBTENER CONFIGURACIÓN GLOBAL DESDE FIREBASE ---
async function getAdminSettings(): Promise<AdminSettings> {
  const defaultSettings: AdminSettings = {
    workers: [{ id: "ana_id", name: "Ana (Responsable)", daysOfWeek: [1, 2, 3, 4, 5, 6], skills: ["peluqueria", "masajes"] }],
    bookingsEnabled: true,
    todayClosed: false,
    todayClosedDate: null,
    vacationRanges: []
  };

  try {
    const docRef = await db.collection("admin").doc("settings").get();
    
    if (!docRef.exists) return defaultSettings;

    const data = docRef.data() || {};
    const staffArray = data.staff || [];

    const workers = staffArray.map((worker: any) => ({
      id: worker.id,
      name: worker.name || "Sin Nombre",
      daysOfWeek: worker.workingDays || [],
      skills: worker.skills || []
    }));

    return {
      workers: workers.length > 0 ? workers : defaultSettings.workers,
      bookingsEnabled: data.bookings_enabled !== false, // Si no existe, asumimos true
      todayClosed: !!data.today_closed,
      todayClosedDate: data.today_closed_date || null,
      vacationRanges: data.vacation_ranges || []
    };

  } catch (error) {
    console.error("❌ Error obteniendo settings de Firebase:", error);
    return defaultSettings;
  }
}

// --- FUNCIONES DE AUTENTICACIÓN (Google Calendar) ---
function getGoogleCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

function getGoogleAuthClient(): any {
  if (jwtClient) return jwtClient;
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!jsonPath) throw new Error("Falta configuración de credenciales de Google (JSON o Path).");

  try {
      let creds;
      if (jsonPath.trim().startsWith('{')) {
          creds = JSON.parse(jsonPath);
      } else {
          const absolutePath = path.resolve(process.cwd(), jsonPath);
          const fileContents = readFileSync(absolutePath, "utf8");
          creds = JSON.parse(fileContents);
      }

    jwtClient = new google.auth.GoogleAuth({
      credentials: { client_email: creds.client_email, private_key: creds.private_key },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    return jwtClient;
  } catch (error) {
    console.error("❌ Error cargando credenciales de Google:", error);
    throw new Error("No se pudo leer el JSON de Google Calendar.");
  }
}

function getCalendar(): ReturnType<typeof google.calendar> {
  if (calendarClient) return calendarClient;
  const auth = getGoogleAuthClient();
  calendarClient = google.calendar({ version: "v3", auth });
  return calendarClient;
}

// --- HELPERS LÓGICOS ---

// Comprueba si un día concreto está cerrado por vacaciones o bloqueo manual
function isDayClosed(dateString: string, settings: AdminSettings): boolean {
  if (!settings.bookingsEnabled) return true;
  
  // Bloqueo puntual ("Cerrado hoy")
  if (settings.todayClosed && settings.todayClosedDate === dateString) {
    return true;
  }

  // Vacaciones (comprueba si la fecha cae dentro de algún rango)
  for (const range of settings.vacationRanges) {
    if (dateString >= range.start && dateString <= range.end) {
      return true;
    }
  }

  return false;
}

function getCapacityForDate(date: Date, currentWorkers: Worker[]): number {
  const day = date.getDay(); 
  const workersToday = currentWorkers.filter(w => w.daysOfWeek.includes(day));
  return workersToday.length;
}

// 🚀 LA SOLUCIÓN AL DESFASE: Nada de recortar strings. Se parsea la hora real de Google.
function toDateTime(value?: string): Date | null {
  if (!value) return null;
  
  // Eventos de todo el día ("2026-04-09") -> Los forzamos a medianoche UTC
  if (!value.includes('T')) {
    const d = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  
  // Eventos con hora ("2026-04-09T12:15:00+02:00"). Javascript lo lee perfectamente a nivel mundial.
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Sweepline: Detecta solapamientos usando la capacidad
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

    let active = 0;
    let fullPeriodStart: number | null = null;
    const busyPeriods: BusyInterval[] = [];

    for (const event of events) {
        if (event.type === 'start') {
            active++;
            if (active >= maxCapacity && fullPeriodStart === null) {
                fullPeriodStart = event.time;
            }
        } else {
            if (active >= maxCapacity && fullPeriodStart !== null && (active - 1) < maxCapacity) {
                busyPeriods.push({ start: new Date(fullPeriodStart), end: new Date(event.time) });
                fullPeriodStart = null;
            }
            active--;
        }
    }

    if (busyPeriods.length === 0) return [];
    
    const merged: BusyInterval[] = [];
    let current = busyPeriods[0];

    for (let i = 1; i < busyPeriods.length; i++) {
        const next = busyPeriods[i];
        if (current.end.getTime() >= next.start.getTime()) {
            current.end = new Date(Math.max(current.end.getTime(), next.end.getTime()));
        } else {
            merged.push(current);
            current = next;
        }
    }
    merged.push(current);

    return merged;
}

function isOurAppointment(event: any) {
  return event?.extendedProperties?.private?.system === SYSTEM_MARKER;
}

function getSandwichPhaseMinutesFromEvent(event: any) {
  const priv = event?.extendedProperties?.private ?? {};
  const phase1Min = priv.phase1Min ? Number(priv.phase1Min) : null;
  const phase2Min = priv.phase2Min ? Number(priv.phase2Min) : null;
  const phase3Min = priv.phase3Min ? Number(priv.phase3Min) : null;

  if (Number.isFinite(phase1Min) && Number.isFinite(phase2Min) && Number.isFinite(phase3Min)) {
    return { phase1Min, phase2Min, phase3Min };
  }
  return { phase1Min: null, phase2Min: null, phase3Min: null };
}

// --- LOGICA PRINCIPAL DE DISPONIBILIDAD (CALCULAR HUECOS) ---
export async function getBusySlots(dateRange: CalendarDateRange): Promise<{ busy: BusyInterval[] }> {
  const calendar = getCalendar();
  const calendarId = getGoogleCalendarId();

  // 1. 📡 Descargamos TODA la configuración de Firebase
  const settings = await getAdminSettings();

  // 2. Pre-poblamos un diccionario con TODOS los días del rango solicitado.
  // Esto es crucial porque si un día está de vacaciones y no tiene eventos en Google, hay que bloquearlo igual.
  const intervalsByDay: Record<string, BusyInterval[]> = {};
  let curr = new Date(dateRange.start);
  curr.setHours(0, 0, 0, 0);
  const limit = new Date(dateRange.end);
  
  while (curr <= limit) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    intervalsByDay[`${y}-${m}-${d}`] = [];
    curr.setDate(curr.getDate() + 1);
  }

  // 3. Traemos todos los eventos de Google Calendar
  const res = await calendar.events.list({
    calendarId,
    timeMin: dateRange.start.toISOString(),
    timeMax: dateRange.end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });

  for (const event of res.data.items ?? []) {
    if (!event.start || !event.end) continue;
    const start = toDateTime((event.start as any).dateTime ?? (event.start as any).date);
    const end = toDateTime((event.end as any).dateTime ?? (event.end as any).date);
    if (!start || !end) continue;

    // Calculamos a qué día pertenece el evento localmente en vez de usar UTC estricto
    const localD = new Date(start.getTime() - start.getTimezoneOffset() * 60000);
    const dateKey = localD.toISOString().split('T')[0]; 
    if (!intervalsByDay[dateKey]) intervalsByDay[dateKey] = [];

    if (!isOurAppointment(event)) {
      intervalsByDay[dateKey].push({ start, end, sourceEventId: event.id ?? undefined });
      continue;
    }

    const phaseMinutes = getSandwichPhaseMinutesFromEvent(event);
    if (!phaseMinutes.phase1Min || !phaseMinutes.phase3Min) {
      intervalsByDay[dateKey].push({ start, end, sourceEventId: event.id ?? undefined });
      continue;
    }

    const phase1End = new Date(start.getTime() + phaseMinutes.phase1Min * 60_000);
    const phase3Start = new Date(end.getTime() - phaseMinutes.phase3Min * 60_000);

    if (phase1End.getTime() >= phase3Start.getTime()) {
      intervalsByDay[dateKey].push({ start, end, sourceEventId: event.id ?? undefined });
      continue;
    }

    intervalsByDay[dateKey].push({ start, end: phase1End, sourceEventId: event.id ?? undefined });
    intervalsByDay[dateKey].push({ start: phase3Start, end, sourceEventId: event.id ?? undefined });
  }

  let finalBusyIntervals: BusyInterval[] = [];

  // 4. Procesar día por día aplicando la capacidad, vacaciones y cierres
  for (const [dateString, intervals] of Object.entries(intervalsByDay)) {
      const [y, m, d] = dateString.split('-').map(Number);
      const date = new Date(y, m - 1, d);

      // A. ¿La peluquería está cerrada por vacaciones o botón de "cerrar hoy"?
      if (isDayClosed(dateString, settings)) {
          finalBusyIntervals.push({ 
            start: new Date(Date.UTC(y, m - 1, d, 0, 0, 0)), 
            end: new Date(Date.UTC(y, m - 1, d, 23, 59, 59)), 
            sourceEventId: "closed_by_admin" 
          });
          continue;
      }

      // B. ¿Hay trabajadores este día?
      const maxCapacity = getCapacityForDate(date, settings.workers);
      if (maxCapacity === 0) {
          finalBusyIntervals.push({ 
            start: new Date(Date.UTC(y, m - 1, d, 0, 0, 0)), 
            end: new Date(Date.UTC(y, m - 1, d, 23, 59, 59)), 
            sourceEventId: "no_workers" 
          });
          continue;
      }
      
      // C. Si está abierta y hay trabajadores, calculamos los solapamientos normales
      const busyForDay = getOverlappingIntervals(intervals, maxCapacity);
      finalBusyIntervals.push(...busyForDay);
  }

  return { busy: finalBusyIntervals };
}

// --- CREAR CITA Y ASIGNAR TRABAJADOR ---
export async function createAppointment(req: CreateAppointmentRequest & { customerName?: string }): Promise<{
  eventId: string;
  htmlLink?: string;
}> {
  const calendar = getCalendar();
  const calendarId = getGoogleCalendarId();
  const timeZone = req.timeZone || process.env.GOOGLE_CALENDAR_TIME_ZONE || "Europe/Madrid";

  const startStr = req.start.toISOString().substring(0, 19);
  const endStr = req.end.toISOString().substring(0, 19);
  const dateString = req.start.toISOString().split('T')[0];

  // 1. 📡 Descargamos configuración de Firebase
  const settings = await getAdminSettings();

  // 2. Seguridad extra: Si justo intentan reservar un día que acaban de cerrar en el panel
  if (isDayClosed(dateString, settings)) {
      throw new Error("La peluquería está cerrada en esta fecha.");
  }

  // 3. Ver qué trabajadores están currando este día
  const dayOfWeek = req.start.getDay();
  const workersToday = settings.workers.filter(w => w.daysOfWeek.includes(dayOfWeek));

  // 4. Ver quiénes están ocupados a esa hora en Google Calendar
  const existingEvents = await calendar.events.list({
      calendarId,
      timeMin: startStr,
      timeMax: endStr,
      singleEvents: true,
  });

  const busyWorkerNames = (existingEvents.data.items || []).map(event => {
      return event.extendedProperties?.private?.workerName;
  }).filter(Boolean);

  // 5. Asignar al primer trabajador libre (o a Ana por defecto)
  const freeWorker = workersToday.find(w => !busyWorkerNames.includes(w.name)) || workersToday[0];
  const assignedTo = freeWorker ? freeWorker.name : "Ana (Responsable)";

  // 6. Crear el evento en Google Calendar
  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `[${assignedTo}] ${req.serviceId.toUpperCase()} - ${req.customerName || 'Cita Web'}`,
      description: req.notes || "",
      start: { dateTime: startStr, timeZone },
      end: { dateTime: endStr, timeZone },
      extendedProperties: {
        private: {
          system: SYSTEM_MARKER,
          bookingId: req.bookingId,
          serviceId: req.serviceId,
          workerName: assignedTo, 
          phase1Min: req.phase1Min != null ? String(req.phase1Min) : "",
          phase2Min: req.phase2Min != null ? String(req.phase2Min) : "",
          phase3Min: req.phase3Min != null ? String(req.phase3Min) : "",
        },
      },
    },
  });

  if (!event.data.id) throw new Error("Google Calendar no devolvió un ID.");
  return { eventId: event.data.id, htmlLink: event.data.htmlLink ?? undefined };
}

// --- CANCELAR CITA ---
export async function cancelAppointment(eventId: string): Promise<void> {
  const calendar = getCalendar();
  const calendarId = getGoogleCalendarId();
  await calendar.events.delete({ calendarId, eventId });
}