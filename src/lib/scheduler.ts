// src/lib/scheduler.ts

interface WorkDay {
  dayId: number;
  isActive: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
}

export interface Employee {
  id: string;
  name: string;
  skills: string[];
  priority: number;
  schedule: WorkDay[]; // 🚀 Nuevo sistema de horarios
}

export interface Phase {
  start: number;
  end: number;
}

export const timeToMinutes = (t: string) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const isOverlap = (p1: Phase, p2: Phase) => {
  return p1.start < p2.end && p1.end > p2.start;
};

// 🚀 NUEVA FUNCIÓN: Comprueba si un hueco (ej. 16:00 a 18:15) cabe DENTRO del turno de Ana (ej. 15:00 a 19:00)
const isWithinWorkingHours = (schedule: WorkDay, startTimeMin: number, endTimeMin: number) => {
  if (!schedule || !schedule.isActive) return false;

  const mStart = timeToMinutes(schedule.morningStart);
  const mEnd = timeToMinutes(schedule.morningEnd);
  const aStart = timeToMinutes(schedule.afternoonStart);
  const aEnd = timeToMinutes(schedule.afternoonEnd);

  // ¿Cabe entero en la mañana?
  const inMorning = (mStart > 0 && mEnd > 0) && (startTimeMin >= mStart && endTimeMin <= mEnd);
  // ¿Cabe entero en la tarde?
  const inAfternoon = (aStart > 0 && aEnd > 0) && (startTimeMin >= aStart && endTimeMin <= aEnd);

  return inMorning || inAfternoon;
};

const isEmployeeFree = (employeeId: string, requiredPhases: {p1: Phase, p2: Phase | null, p3: Phase | null}, dayBookings: any[], schedule: WorkDay) => {
  
  // 1. ¿Cabe el servicio entero dentro de su horario laboral (antes de irse a casa)?
  const serviceStart = requiredPhases.p1.start;
  const serviceEnd = requiredPhases.p3 ? requiredPhases.p3.end : (requiredPhases.p2 ? requiredPhases.p2.end : requiredPhases.p1.end);
  
  if (!isWithinWorkingHours(schedule, serviceStart, serviceEnd)) {
    return false; // El servicio termina cuando el salón ya está cerrado
  }

  // 2. Comprobamos los choques con eventos y Google Calendar
  const employeeBookings = dayBookings.filter(b => 
    b.status !== "cancelled" && 
    (b.employee_id === employeeId || !b.employee_id || b.isManual || b.type === "block")
  );

  for (const booking of employeeBookings) {
    const bStart = timeToMinutes(booking.start_time || (booking.startTime?.split('T')[1]?.substring(0,5)));
    const bEnd = timeToMinutes(booking.end_time || (booking.endTime?.split('T')[1]?.substring(0,5)));
    
    const isWorking = booking.isAppointment === true;

    if (!isWorking && (booking.isManual || booking.type === "block")) {
      const totalBlock = { start: bStart, end: bEnd };
      if (isOverlap(requiredPhases.p1, totalBlock)) return false;
      if (requiredPhases.p2 && isOverlap(requiredPhases.p2, totalBlock)) return false;
      if (requiredPhases.p3 && isOverlap(requiredPhases.p3, totalBlock)) return false;
    } else {
      const workBlock = { start: bStart, end: bEnd };
      if (isOverlap(requiredPhases.p1, workBlock)) return false;
      if (requiredPhases.p3 && isOverlap(requiredPhases.p3, workBlock)) return false;
    }
  }
  return true; 
};

const getLocalDateStr = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const calculateAvailability = (
  allSlots: string[], 
  service: any, 
  dayBookings: any[], 
  employees: Employee[],
  selectedDate: Date,
  isToday: boolean,
  currentMinutes: number
) => {
  const occupied = new Set<string>();
  const assignments: Record<string, string> = {}; 

  if (!service || !selectedDate) return { occupied: new Set(allSlots), assignments };

  const dayOfWeek = selectedDate.getDay();
  const cP1 = Number(service.phase1_min || service.phase1Min || service.duration_min || service.durationMin || 0);
  const cP2 = Number(service.phase2_min || service.phase2Min || 0);
  const cP3 = Number(service.phase3_min || service.phase3Min || 0);
  
  const serviceCat = service.category?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

  // Filtramos a los trabajadores que: Saben hacer el servicio y hoy es su día de trabajo
  const validStaff = employees.filter(e => {
    if (!e.skills.includes(serviceCat)) return false;
    // Comprobamos si tiene un horario activo para hoy
    const todaySchedule = e.schedule?.find(d => d.dayId === dayOfWeek);
    if (!todaySchedule || !todaySchedule.isActive) return false;
    return true;
  }).sort((a, b) => a.priority - b.priority);

  for (const slot of allSlots) {
    const slotStart = timeToMinutes(slot);
    
    // Si la hora ya ha pasado hoy, la tachamos
    if (isToday && slotStart <= currentMinutes) {
      occupied.add(slot);
      continue;
    }

    const reqPhases = {
      p1: { start: slotStart, end: slotStart + cP1 },
      p2: cP2 > 0 ? { start: slotStart + cP1, end: slotStart + cP1 + cP2 } : null,
      p3: cP3 > 0 ? { start: slotStart + cP1 + cP2, end: slotStart + cP1 + cP2 + cP3 } : null
    };

    let assignedId = null;
    
    // Verificamos si algún trabajador válido puede hacer el servicio
    for (const emp of validStaff) {
      const todaySchedule = emp.schedule.find(d => d.dayId === dayOfWeek)!;
      if (isEmployeeFree(emp.id, reqPhases, dayBookings, todaySchedule)) {
        assignedId = emp.id;
        break; 
      }
    }

    if (assignedId) {
      assignments[slot] = assignedId;
    } else {
      occupied.add(slot);
    }
  }

  return { occupied, assignments };
};