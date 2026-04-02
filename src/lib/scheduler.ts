// src/lib/scheduler.ts

export interface Employee {
  id: string;
  name: string;
  skills: string[]; // ["peluqueria", "masajes"]
  workingDays: number[]; // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  priority: number; // 1 = Ana (Preferente), 2 = Refuerzo
  vacations?: { start: string; end: string }[]; // 🔥 NUEVO: Vacaciones individuales
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

const isEmployeeFree = (employeeId: string, requiredPhases: Phase[], dayBookings: any[]) => {
  // 1. Buscamos bloqueos: citas de este empleado O bloqueos manuales de Google
  const employeeBookings = dayBookings.filter(b => 
    b.isManual === true || 
    b.type === "block" || 
    b.employee_id === employeeId || 
    !b.employee_id
  );

  for (const booking of employeeBookings) {
    if (booking.status === "cancelled") continue;

    const bStart = timeToMinutes(booking.start_time);
    const bEnd = timeToMinutes(booking.end_time);
    
    // Si es un bloqueo manual de Google, ocupa todo el tramo de golpe
    // Si es una reserva normal, respetamos las fases (p1, p2, p3)
    let occupancyEnd;
    if (booking.isManual || booking.type === "block") {
      occupancyEnd = bEnd;
    } else {
      const p1 = Number(booking.phase1_min || 0);
      occupancyEnd = bStart + p1;
    }

    const existingBlock = { start: bStart, end: occupancyEnd };

    for (const reqPhase of requiredPhases) {
      if (isOverlap(reqPhase, existingBlock)) return false;
      
      // Si el bloqueo es de Google y es de todo el día, 
      // bloqueamos también la fase 3 si existiera
      if ((booking.isManual || booking.type === "block") && bEnd > reqPhase.start) {
        if (reqPhase.start < bEnd && reqPhase.end > bStart) return false;
      }
    }
  }
  return true; 
};

// Función de ayuda interna para la fecha
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

  // 🔥 NUEVO: Filtramos quién sabe hacerlo, quién trabaja hoy y quién NO está de vacaciones
  const validStaff = employees.filter(e => {
    // 1. ¿Sabe hacer el servicio y trabaja este día de la semana?
    if (!e.skills.includes(serviceCat) || !e.workingDays.includes(dayOfWeek)) return false;
    
    // 2. ¿Está de vacaciones personales en esta fecha concreta?
    if (e.vacations && e.vacations.length > 0) {
      for (const vac of e.vacations) {
        if (dateStr >= vac.start && dateStr <= vac.end) return false; // Está de vacaciones, la descartamos
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

    const reqPhases: Phase[] = [];
    if (cP1 > 0) reqPhases.push({ start: slotStart, end: slotStart + cP1 });
    if (cP3 > 0) reqPhases.push({ start: slotStart + cP1 + cP2, end: slotStart + cP1 + cP2 + cP3 });

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