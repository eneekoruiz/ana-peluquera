import { describe, it, expect } from 'vitest';
import { calculateAvailability, Employee } from './scheduler';

describe('Algoritmo Sándwich y Saturación', () => {
  const ALL_SLOTS = [
    "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
    "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45",
    "13:00", "13:15", "15:00", "15:15", "15:30", "15:45", "16:00", "16:15",
    "16:30", "16:45", "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45"
  ];
  
  const date = new Date("2026-04-17T00:00:00"); // Un viernes
  
  const employees: Employee[] = [
    { id: "refuerzo_id", name: "Refuerzo", skills: ["peluqueria"], workingDays: [5], priority: 1 }
  ];

  it('Caso Límite 1: El Sándwich Perfecto', () => {
    const service = { category: "peluqueria", phase1_min: 45, phase2_min: 60, phase3_min: 30 };
    const dayBookings = [
      { employee_id: "refuerzo_id", status: "confirmed", start_time: "09:00", end_time: "11:15", phase1_min: 45, phase2_min: 60, phase3_min: 30 }
    ];

    const { occupied } = calculateAvailability(ALL_SLOTS, service, dayBookings, employees, date, false, 0);

    expect(occupied.has("09:00")).toBe(true);
    expect(occupied.has("09:15")).toBe(true);
    expect(occupied.has("09:45")).toBe(false); 
  });

  it('Caso Límite 2: Choque en la Fase 3 (Lavado saturado)', () => {
    const serviceCorte = { category: "peluqueria", duration_min: 30, phase1_min: 30, phase2_min: 0, phase3_min: 0 };
    const dayBookings = [
      { employee_id: "refuerzo_id", status: "confirmed", start_time: "09:00", phase1_min: 45, phase2_min: 60, phase3_min: 30 }
    ];

    const { occupied } = calculateAvailability(ALL_SLOTS, serviceCorte, dayBookings, employees, date, false, 0);

    expect(occupied.has("10:15")).toBe(false);
    expect(occupied.has("10:30")).toBe(true); 
  });

  it('Caso Límite 3: Saturación de dos trabajadoras a la vez', () => {
    const twoEmployees: Employee[] = [
      { id: "ana", name: "Ana", skills: ["peluqueria"], workingDays: [5], priority: 1 },
      { id: "refuerzo", name: "Refuerzo", skills: ["peluqueria"], workingDays: [5], priority: 2 }
    ];
    const serviceCorte = { category: "peluqueria", duration_min: 30, phase1_min: 30, phase2_min: 0, phase3_min: 0 };
    
    // Ana tiene cita a las 10:00. Refuerzo tiene cita a las 10:30.
    const dayBookings = [
      { employee_id: "ana", status: "confirmed", start_time: "10:00", phase1_min: 30, phase2_min: 0, phase3_min: 0 },
      { employee_id: "refuerzo", status: "confirmed", start_time: "10:30", phase1_min: 30, phase2_min: 0, phase3_min: 0 }
    ];

    const { occupied } = calculateAvailability(ALL_SLOTS, serviceCorte, dayBookings, twoEmployees, date, false, 0);

    // Las 10:00 debe estar disponible porque el Refuerzo puede cogerlo (su primera cita es a las 10:30)
    expect(occupied.has("10:00")).toBe(false); 
    // Las 10:15 debe estar ocupado: un servicio de 30 min se chocaría con el fin de Ana o con el inicio del Refuerzo.
    expect(occupied.has("10:15")).toBe(true); 
  });

  it('Caso Límite 4: El falso hueco (Sándwich inverso)', () => {
    // Para probar el sándwich de Ana, pasamos un array donde SOLO trabaja Ana
    const onlyAna: Employee[] = [
      { id: "ana_id", name: "Ana", skills: ["peluqueria"], workingDays: [5], priority: 1 }
    ];

    const dayBookings = [
      { employee_id: "ana_id", status: "confirmed", start_time: "09:00", phase1_min: 45, phase2_min: 60, phase3_min: 30 }
    ];
    const serviceLargo = { category: "peluqueria", duration_min: 90, phase1_min: 90, phase2_min: 0, phase3_min: 0 };
    
    const { occupied } = calculateAvailability(ALL_SLOTS, serviceLargo, dayBookings, onlyAna, date, false, 0);

    // Ahora sí, el sistema no tiene al Refuerzo para salvarle y debe bloquear a Ana
    expect(occupied.has("09:45")).toBe(true);
  });
  it('Caso Límite 5: Encaje exacto al milímetro (Fronteras de tiempo)', () => {
    // Si un cliente sale por la puerta a las 10:00 en punto, ¿puede entrar otro a las 10:00 en punto?
    // El algoritmo tiene que ser capaz de ver que NO hay solapamiento si start === end.
    const onlyAna: Employee[] = [{ id: "ana", name: "Ana", skills: ["peluqueria"], workingDays: [5], priority: 1 }];
    
    const dayBookings = [
      { employee_id: "ana", status: "confirmed", start_time: "09:30", phase1_min: 30, phase2_min: 0, phase3_min: 0 } // Acaba exactamente a las 10:00
    ];
    const serviceNuevo = { category: "peluqueria", duration_min: 30, phase1_min: 30, phase2_min: 0, phase3_min: 0 };
    
    const { occupied } = calculateAvailability(ALL_SLOTS, serviceNuevo, dayBookings, onlyAna, date, false, 0);

    // 09:30 y 09:45 deben estar bloqueados.
    expect(occupied.has("09:45")).toBe(true);
    // 10:00 debe estar LIBRE. El asiento ni siquiera se ha enfriado, pero matemáticamente cabe.
    expect(occupied.has("10:00")).toBe(false);
  });

  it('Caso Límite 6: Sándwich Anidado (Inception de citas)', () => {
    // Ana tiene unas Mechas (45 TRABAJO - 60 ESPERA - 30 TRABAJO) a las 09:00.
    // Ocupada: 09:00-09:45 y 10:45-11:15. Libre de: 09:45 a 10:45 (60 mins exactos).
    const onlyAna: Employee[] = [{ id: "ana", name: "Ana", skills: ["peluqueria"], workingDays: [5], priority: 1 }];
    const dayBookings = [
      { employee_id: "ana", status: "confirmed", start_time: "09:00", phase1_min: 45, phase2_min: 60, phase3_min: 30 }
    ];
    
    // Cliente 2 quiere un corte de 45 mins. ¿Cabe en ese hueco de 60 mins?
    const corteLargo = { category: "peluqueria", duration_min: 45, phase1_min: 45, phase2_min: 0, phase3_min: 0 };
    const { occupied } = calculateAvailability(ALL_SLOTS, corteLargo, dayBookings, onlyAna, date, false, 0);

    // Puede empezar a las 09:45 (acaba 10:30, le sobran 15 min antes de lavar al cliente 1)
    expect(occupied.has("09:45")).toBe(false);
    // Puede empezar a las 10:00 (acaba 10:45, el cliente 1 justo termina su espera). Encaje perfecto.
    expect(occupied.has("10:00")).toBe(false);
    // NO puede empezar 10:15 (acaba 11:00, pisa de lleno el lavado del cliente 1)
    expect(occupied.has("10:15")).toBe(true);
  });

  it('Caso Límite 7: Restricción de Habilidades (El especialista equivocado)', () => {
    // Ana sabe dar "masajes", el Refuerzo NO.
    const staff: Employee[] = [
      { id: "ana", name: "Ana", skills: ["peluqueria", "masajes"], workingDays: [5], priority: 1 },
      { id: "refuerzo", name: "Refuerzo", skills: ["peluqueria"], workingDays: [5], priority: 2 }
    ];

    // Ana está OCUPADA a las 10:00 con un corte. El Refuerzo está LIBRE.
    const dayBookings = [
      { employee_id: "ana", status: "confirmed", start_time: "10:00", phase1_min: 30, phase2_min: 0, phase3_min: 0 }
    ];

    // Cliente quiere MASAJES a las 10:00.
    const masaje = { category: "masajes", duration_min: 30, phase1_min: 30, phase2_min: 0, phase3_min: 0 };
    const { occupied } = calculateAvailability(ALL_SLOTS, masaje, dayBookings, staff, date, false, 0);

    // Aunque el Refuerzo está ahí mirando el móvil (libre), NO sabe dar masajes. 
    // Por tanto, las 10:00 DEBE estar bloqueado para la clienta.
    expect(occupied.has("10:00")).toBe(true);
  });
});