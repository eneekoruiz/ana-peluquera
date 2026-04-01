import { google } from "googleapis";
import { readFileSync } from "fs"; 
import path from "path"; 
// 👇 Importamos Firebase Admin (Asegúrate de que la ruta sea correcta hacia tu archivo firebaseAdmin.ts)
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

// Interfaz para mapear los trabajadores de tu Firebase
export interface Worker {
  id: string;
  name: string;
  daysOfWeek: number[]; // Lo mapeamos internamente aunque en Firebase se llame 'workingDays'
  skills: string[];     // Guardamos las habilidades para uso futuro
}

const SYSTEM_MARKER = "ag-beauty-salon";

let calendarClient: ReturnType<typeof google.calendar> | null = null;
let jwtClient: any | null = null;

// --- 📡 OBTENER TRABAJADORES DESDE FIREBASE ---
async function getWorkers(): Promise<Worker[]> {
  try {
    // Apuntamos a la colección 'admin' y documento 'settings' (como en tu captura)
    const docRef = await db.collection("admin").doc("settings").get();
    
    if (!docRef.exists) {
      console.warn("⚠️ No se encontró admin/settings. Usando a Ana por defecto.");
      return [{ id: "ana_id", name: "Ana (Responsable)", daysOfWeek: [1, 2, 3, 4, 5, 6], skills: ["peluqueria", "masajes"] }];
    }

    const data = docRef.data();
    const staffArray = data?.staff;

    if (!staffArray || !Array.isArray(staffArray) || staffArray.length === 0) {
      console.warn("⚠️ El array 'staff' está vacío. Usando a Ana por defecto.");
      return [{ id: "ana_id", name: "Ana (Responsable)", daysOfWeek: [1, 2, 3, 4, 5, 6], skills: ["peluqueria", "masajes"] }];
    }

    // Traducimos los datos de tu Firebase al formato interno
    return staffArray.map((worker: any) => {
      return {
        id: worker.id,
        name: worker.name || "Sin Nombre",
        daysOfWeek: worker.workingDays || [], // Mapeamos 'workingDays' a 'daysOfWeek'
        skills: worker.skills || []           // Extraemos 'skills'
      };
    }) as Worker[];

  } catch (error) {
    console.error("❌ Error conectando con Firebase para sacar los trabajadores:", error);
    // Salvavidas por si la base de datos no responde
    return [{ id: "ana_id", name: "Ana (Responsable)", daysOfWeek: [1, 2, 3, 4, 5, 6], skills: ["peluqueria", "masajes"] }];
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
      // Magia para que funcione en Vercel (texto directo) y en Local (archivo físico)
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

// Calcula cuántos trabajadores hay currando un día concreto
function getCapacityForDate(date: Date, currentWorkers: Worker[]): number {
  const day = date.getDay(); // 0 = Dom, 1 = Lun, 2 = Mar...
  const workersToday = currentWorkers.filter(w => w.daysOfWeek.includes(day));
  return workersToday.length;
}

function toDateTime(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// Algoritmo de Sweepline: Detecta huecos bloqueados solo cuando se supera la capacidad máxima de la peluquería
function getOverlappingIntervals(intervals: BusyInterval[], maxCapacity: number): BusyInterval[] {
    if (intervals.length === 0 || maxCapacity === 0) return [];
    
    const events: { time: number, type: 'start' | 'end', originalInterval: BusyInterval }[] = [];
    for (const interval of intervals) {
        events.push({ time: interval.start.getTime(), type: 'start', originalInterval: interval });
        events.push({ time: interval.end.getTime(), type: 'end', originalInterval: interval });
    }

    // Ordenar cronológicamente
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
                fullPeriodStart = event.time; // Peluquería llena
            }
        } else {
            if (active >= maxCapacity && fullPeriodStart !== null && (active - 1) < maxCapacity) {
                busyPeriods.push({ start: new Date(fullPeriodStart), end: new Date(event.time) });
                fullPeriodStart = null; // Vuelve a haber hueco
            }
            active--;
        }
    }

    if (busyPeriods.length === 0) return [];
    
    // Fusionar periodos adyacentes por si acaso
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

// Saca los tiempos de las fases para la lógica del "Sándwich"
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

  // 1. 📡 Descargamos los trabajadores de Firebase
  const dbWorkers = await getWorkers();

  // 2. Traemos todos los eventos de Google Calendar en ese rango
  const res = await calendar.events.list({
    calendarId,
    timeMin: dateRange.start.toISOString(),
    timeMax: dateRange.end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });

  // Agrupamos los eventos por día (YYYY-MM-DD)
  const intervalsByDay: Record<string, BusyInterval[]> = {};

  for (const event of res.data.items ?? []) {
    if (!event.start || !event.end) continue;
    const start = toDateTime((event.start as any).dateTime ?? (event.start as any).date);
    const end = toDateTime((event.end as any).dateTime ?? (event.end as any).date);
    if (!start || !end) continue;

    const dateKey = start.toISOString().split('T')[0]; 
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

    // Lógica del Sándwich: Ocupamos la Fase 1 y Fase 3, liberando la Fase 2 (espera)
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

  // 3. Procesar día por día aplicando la capacidad dinámica
  for (const [dateString, intervals] of Object.entries(intervalsByDay)) {
      const date = new Date(dateString);
      const maxCapacity = getCapacityForDate(date, dbWorkers);
      
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

  const startStr = req.start.toISOString();
  const endStr = req.end.toISOString();

  // 1. 📡 Descargamos los trabajadores de Firebase
  const dbWorkers = await getWorkers();

  // 2. Ver qué trabajadores de la BD están currando este día
  const dayOfWeek = req.start.getDay();
  const workersToday = dbWorkers.filter(w => w.daysOfWeek.includes(dayOfWeek));

  // 3. Ver quiénes están ocupados a esa hora exacta en Google Calendar
  const existingEvents = await calendar.events.list({
      calendarId,
      timeMin: startStr,
      timeMax: endStr,
      singleEvents: true,
  });

  const busyWorkerNames = (existingEvents.data.items || []).map(event => {
      return event.extendedProperties?.private?.workerName;
  }).filter(Boolean); // Filtramos los nulos

  // 4. Asignar al primer trabajador de turno que NO esté en la lista de ocupados
  const freeWorker = workersToday.find(w => !busyWorkerNames.includes(w.name)) || workersToday[0];
  const assignedTo = freeWorker ? freeWorker.name : "Ana (Responsable)";

  // 5. Crear el evento en Google Calendar
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
          workerName: assignedTo, // Guardamos a quién se le asignó como rastro
          phase1Min: req.phase1Min != null ? String(req.phase1Min) : "",
          phase2Min: req.phase2Min != null ? String(req.phase2Min) : "",
          phase3Min: req.phase3Min != null ? String(req.phase3Min) : "",
        },
      },
    },
  });

  if (!event.data.id) throw new Error("Google Calendar no devolvió un ID para el evento.");
  return { eventId: event.data.id, htmlLink: event.data.htmlLink ?? undefined };
}

// --- CANCELAR CITA ---
export async function cancelAppointment(eventId: string): Promise<void> {
  const calendar = getCalendar();
  const calendarId = getGoogleCalendarId();
  await calendar.events.delete({ calendarId, eventId });
}