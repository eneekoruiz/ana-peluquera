// src/lib/scheduler.ts

const LEAD_TIME_MINUTES = 120; // 2 horas de antelación mínima
const BUFFER_MINUTES = 0;    // Sin margen entre citas por petición del usuario


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
  
  // 1. ¿Cabe el servicio entero (incluyendo buffer) dentro de su horario laboral?
  const serviceStart = requiredPhases.p1.start;
  const serviceEndWithoutBuffer = requiredPhases.p3 ? requiredPhases.p3.end : (requiredPhases.p2 ? requiredPhases.p2.end : requiredPhases.p1.end);
  const serviceEndWithBuffer = serviceEndWithoutBuffer + BUFFER_MINUTES;

  
  if (!isWithinWorkingHours(schedule, serviceStart, serviceEndWithoutBuffer)) {
    return false; // El servicio termina cuando el salón ya está cerrado (permitimos que el buffer caiga fuera del horario)
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
      // 🚀 MEJORA: Si la cita existente tiene fases, solo chocamos con sus partes de TRABAJO
      const bP1 = Number(booking.phase1_min || booking.phase1Min || 0);
      const bP3 = Number(booking.phase3_min || booking.phase3Min || 0);

      if (bP1 > 0 || bP3 > 0) {
        // La cita tiene fases: Chocamos con P1 y con P3 (con sus buffers)
        const workP1 = { start: bStart, end: bStart + bP1 + BUFFER_MINUTES };
        const workP3 = { start: bEnd - bP3, end: bEnd + BUFFER_MINUTES };

        if (isOverlap(requiredPhases.p1, workP1)) return false;
        if (isOverlap(requiredPhases.p1, workP3)) return false;
        if (requiredPhases.p3) {
          if (isOverlap(requiredPhases.p3, workP1)) return false;
          if (isOverlap(requiredPhases.p3, workP3)) return false;
        }
      } else {
        // Cita sólida (sin fases)
        const workBlock = { start: bStart, end: bEnd + BUFFER_MINUTES };
        if (isOverlap(requiredPhases.p1, workBlock)) return false;
        if (requiredPhases.p3 && isOverlap(requiredPhases.p3, workBlock)) return false;
      }
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
    const employeeSkills = e.skills.map(s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    if (!employeeSkills.includes(serviceCat)) return false;
    // Comprobamos si tiene un horario activo para hoy
    const todaySchedule = e.schedule?.find(d => d.dayId === dayOfWeek);
    if (!todaySchedule || !todaySchedule.isActive) return false;
    return true;
  }).sort((a, b) => a.priority - b.priority);

  for (const slot of allSlots) {
    const slotStart = timeToMinutes(slot);
    
    // Si la hora ya ha pasado hoy (o falta poco), la tachamos
    if (isToday && slotStart <= (currentMinutes + LEAD_TIME_MINUTES)) {
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