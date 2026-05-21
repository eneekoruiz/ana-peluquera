export interface Interval {
  start: number;
  end: number;
}

export interface Phase extends Interval {}

export interface RequestPhases {
  p1: Phase;
  p2: Phase | null;
  p3: Phase | null;
}

export interface WorkDay {
  dayId: number;
  isActive: boolean;
  slots: { start: string; end: string }[];
}

export interface BusyInterval {
  start: any; // Can be Date, string or dayjs depending on context
  end: any;
  isAppointment?: boolean;
  isTotalBlock?: boolean;
}

/**
 * Convierte "HH:mm" a minutos desde el inicio del día.
 */
export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Comprueba si dos intervalos solapan, considerando un margen opcional.
 */
export const isOverlap = (a: Interval, b: Interval, buffer: number = 0): boolean => {
  return a.start < (b.end + buffer) && (a.end + buffer) > b.start;
};

/**
 * Comprueba si un servicio está dentro del horario laboral.
 */
export const isWithinWorkingHours = (schedule: WorkDay & { morningStart?: string; morningEnd?: string; afternoonStart?: string; afternoonEnd?: string; isSplit?: boolean }, start: number, end: number): boolean => {
  if (!schedule.isActive) return false;

  // Nuevo formato (morningStart/End + afternoonStart/End)
  if (schedule.morningStart !== undefined) {
    const slots: { start: string; end: string }[] = [];
    if (schedule.morningStart && schedule.morningEnd) {
      slots.push({ start: schedule.morningStart, end: schedule.morningEnd });
    }
    if (schedule.isSplit && schedule.afternoonStart && schedule.afternoonEnd) {
      slots.push({ start: schedule.afternoonStart, end: schedule.afternoonEnd });
    }
    if (slots.length === 0) return false;
    return slots.some(slot => {
      const slotStart = timeToMinutes(slot.start);
      const slotEnd = timeToMinutes(slot.end);
      return start >= slotStart && end <= slotEnd;
    });
  }

  // Formato original (slots[])
  if (!schedule.slots || schedule.slots.length === 0) return false;
  return schedule.slots.some(slot => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    return start >= slotStart && end <= slotEnd;
  });
};

/**
 * Lógica Sándwich: Comprueba si hay hueco para un servicio con fases.
 * P1 y P3 requieren al empleado (no pueden solapar con otras citas).
 * P2 es tiempo de espera (puede solapar con otras citas, pero no con bloqueos totales).
 */
export const isSlotAvailable = (
  req: RequestPhases, 
  occupied: any[], 
  buffer: number = 0
): boolean => {
  return !occupied.some(occ => {
    // Si la reserva está cancelada, la ignoramos
    if (occ.status === "cancelled") return false;

    // Calculamos el inicio y fin del intervalo ocupado en minutos
    let occStart: number;
    let occEnd: number;

    // Si viene de Google Calendar (o similar) ya procesado como BusyInterval (en minutos o Date)
    if (occ.start && typeof occ.start.hour === 'function') {
      // Es un objeto Day.js: extraemos la hora y minuto en su zona horaria nativa (ej: Europe/Madrid)
      occStart = occ.start.hour() * 60 + occ.start.minute();
      occEnd = occ.end.hour() * 60 + occ.end.minute();
    } else if (occ.start?.minutes !== undefined) {
      occStart = occ.start.minutes;
      occEnd = occ.end.minutes;
    } else if (typeof occ.start_time === 'string') {
      // Formato backend Firebase
      occStart = timeToMinutes(occ.start_time);
      occEnd = timeToMinutes(occ.end_time);
    } else {
      // Fallback para otros formatos (Date o similar)
      const dStart = new Date(occ.start);
      const dEnd = new Date(occ.end);
      occStart = dStart.getHours() * 60 + dStart.getMinutes();
      occEnd = dEnd.getHours() * 60 + dEnd.getMinutes();
    }

    const isTotalBlock = occ.isTotalBlock || occ.type === "block" || occ.isManual;

    if (isTotalBlock) {
      const occInterval = { start: occStart, end: occEnd };
      if (isOverlap(req.p1, occInterval, buffer)) return true;
      if (req.p3 && isOverlap(req.p3, occInterval, buffer)) return true;
      if (req.p2 && isOverlap(req.p2, occInterval, buffer)) return true;
    } else {
      const occP1Min = Number(occ.phase1_min || occ.phase1Min || occ.duration_min || occ.durationMin || 0);
      const occP3Min = Number(occ.phase3_min || occ.phase3Min || 0);
      
      const occP1 = { start: occStart, end: occStart + occP1Min };
      const occP3 = occP3Min > 0 ? { start: occEnd - occP3Min, end: occEnd } : null;

      if (isOverlap(req.p1, occP1, buffer)) return true;
      if (occP3 && isOverlap(req.p1, occP3, buffer)) return true;

      if (req.p3) {
        if (isOverlap(req.p3, occP1, buffer)) return true;
        if (occP3 && isOverlap(req.p3, occP3, buffer)) return true;
      }
    }

    return false;
  });
};

/**
 * Algoritmo Sweep-line para encontrar periodos donde la capacidad está al máximo.
 * Se usa para determinar cuándo el salón está "lleno" en Google Calendar.
 */
export function getOverlappingIntervals(
  intervals: any[], 
  maxCapacity: number,
  toMinutes: (val: any) => number
): { start: number, end: number }[] {
  if (intervals.length === 0 || maxCapacity === 0) return [];

  const events: { time: number, type: 'start' | 'end', weight: number }[] = [];
  
  for (const interval of intervals) {
    const start = toMinutes(interval.start);
    const end = toMinutes(interval.end);
    const weight = interval.isTotalBlock ? maxCapacity : 1;
    
    events.push({ time: start, type: 'start', weight });
    events.push({ time: end, type: 'end', weight });
  }

  // Ordenar: primero por tiempo, luego 'end' antes que 'start' para intervalos contiguos
  events.sort((a, b) => a.time - b.time || (a.type === 'end' ? -1 : 1));

  let active = 0;
  let fullPeriodStart: number | null = null;
  const busyPeriods: { start: number, end: number }[] = [];

  for (const event of events) {
    if (event.type === 'start') {
      active += event.weight;
      if (active >= maxCapacity && fullPeriodStart === null) {
        fullPeriodStart = event.time;
      }
    } else {
      if (active >= maxCapacity && fullPeriodStart !== null && (active - event.weight) < maxCapacity) {
        if (event.time > fullPeriodStart) {
          busyPeriods.push({ start: fullPeriodStart, end: event.time });
        }
        fullPeriodStart = null;
      }
      active -= event.weight;
    }
  }

  // Mezclar periodos contiguos o solapados
  if (busyPeriods.length === 0) return [];
  const merged: { start: number, end: number }[] = [];
  let current = busyPeriods[0];

  for (let i = 1; i < busyPeriods.length; i++) {
    if (current.end >= busyPeriods[i].start) {
      current.end = Math.max(current.end, busyPeriods[i].end);
    } else {
      merged.push(current);
      current = busyPeriods[i];
    }
  }
  merged.push(current);

  return merged;
}