import { 
  timeToMinutes, 
  isOverlap, 
  isWithinWorkingHours, 
  isSlotAvailable,
  type Phase,
  type WorkDay
} from "@ana-peluquera/scheduler";

const LEAD_TIME_MINUTES = 120; // 2 horas de antelación mínima
const BUFFER_MINUTES = 0;    // Sin margen entre citas por petición del usuario


// Types and core logic are now imported from @ana-peluquera/scheduler

export interface Employee {
  id: string;
  name: string;
  skills: string[];
  priority: number;
  schedule: WorkDay[];
}

const isEmployeeFree = (employeeId: string, requiredPhases: any, dayBookings: any[], schedule: WorkDay) => {
  // 1. ¿Cabe el servicio entero dentro de su horario laboral?
  const serviceStart = requiredPhases.p1.start;
  const serviceEndWithoutBuffer = requiredPhases.p3 ? requiredPhases.p3.end : (requiredPhases.p2 ? requiredPhases.p2.end : requiredPhases.p1.end);
  
  if (!isWithinWorkingHours(schedule, serviceStart, serviceEndWithoutBuffer)) {
    return false;
  }

  // 2. Comprobamos los choques usando la lógica unificada
  const employeeBookings = dayBookings.filter(b => 
    b.status !== "cancelled" && 
    (b.employee_id === employeeId || !b.employee_id || b.isManual || b.type === "block")
  );

  return isSlotAvailable(requiredPhases, employeeBookings, BUFFER_MINUTES);
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