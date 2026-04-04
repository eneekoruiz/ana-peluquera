// src/lib/scheduler.ts

export interface Employee {
  id: string;
  name: string;
  skills: string[];
  workingDays: number[];
  priority: number;
  vacations?: { start: string; end: string }[];
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

const isEmployeeFree = (employeeId: string, requiredPhases: {p1: Phase, p2: Phase | null, p3: Phase | null}, dayBookings: any[]) => {
  const employeeBookings = dayBookings.filter(b => 
    b.status !== "cancelled" && 
    (b.employee_id === employeeId || !b.employee_id || b.isManual || b.type === "block")
  );

  for (const booking of employeeBookings) {
    const bStart = timeToMinutes(booking.start_time || (booking.startTime?.split('T')[1]?.substring(0,5)));
    const bEnd = timeToMinutes(booking.end_time || (booking.endTime?.split('T')[1]?.substring(0,5)));
    
    // 🔍 Miramos si la API nos dice que es una CITA de trabajo
    const isWorking = booking.isAppointment === true;

    if (!isWorking && (booking.isManual || booking.type === "block")) {
      // 🚨 CASO "BLOQUEO TOTAL" (Médico, Vacaciones, o bloqueo de Google sin la palabra CITA)
      // Bloqueamos TODO (P1, P2 y P3). Ana NO está en el local.
      const totalBlock = { start: bStart, end: bEnd };
      if (isOverlap(requiredPhases.p1, totalBlock)) return false;
      if (requiredPhases.p2 && isOverlap(requiredPhases.p2, totalBlock)) return false;
      if (requiredPhases.p3 && isOverlap(requiredPhases.p3, totalBlock)) return false;
    } else {
      // 💇 CASO "TRABAJO" (Es una CITA o una reserva de la web)
      // Ana está en el salón. Solo bloqueamos sus manos (P1 y P3).
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
  const dateStr = getLocalDateStr(selectedDate);
  const cP1 = Number(service.phase1_min || service.phase1Min || service.duration_min || service.durationMin || 0);
  const cP2 = Number(service.phase2_min || service.phase2Min || 0);
  const cP3 = Number(service.phase3_min || service.phase3Min || 0);
  
  const serviceCat = service.category?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

  const validStaff = employees.filter(e => {
    if (!e.skills.includes(serviceCat) || !e.workingDays.includes(dayOfWeek)) return false;
    
    if (e.vacations && e.vacations.length > 0) {
      for (const vac of e.vacations) {
        if (dateStr >= vac.start && dateStr <= vac.end) return false;
      }
    }
    return true;
  }).sort((a, b) => a.priority - b.priority);

  for (const slot of allSlots) {
    const slotStart = timeToMinutes(slot);
    if (isToday && slotStart <= currentMinutes) {
      occupied.add(slot);
      continue;
    }

    // 🚀 La magia está aquí: Empezamos a enviarle la p2 al comprobador
    const reqPhases = {
      p1: { start: slotStart, end: slotStart + cP1 },
      p2: cP2 > 0 ? { start: slotStart + cP1, end: slotStart + cP1 + cP2 } : null,
      p3: cP3 > 0 ? { start: slotStart + cP1 + cP2, end: slotStart + cP1 + cP2 + cP3 } : null
    };

    let assignedId = null;
    for (const emp of validStaff) {
      if (isEmployeeFree(emp.id, reqPhases, dayBookings)) {
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