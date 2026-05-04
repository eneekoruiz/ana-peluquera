import { describe, it, expect } from 'vitest';
import { calculateAvailability, Employee } from './scheduler';

describe('Algoritmo Sándwich y Saturación', () => {
  const ALL_SLOTS = [
    "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
    "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45",
    "13:00", "13:15", "15:00", "15:15", "15:30", "15:45", "16:00", "16:15",
    "16:30", "16:45", "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45"
  ];
  
  const date = new Date("2026-04-17T00:00:00"); // Un viernes (dayId: 5)
  
  const defaultSchedule = [
    { dayId: 5, isActive: true, morningStart: "09:00", morningEnd: "14:00", afternoonStart: "15:00", afternoonEnd: "20:00" },
    { dayId: 1, isActive: true, morningStart: "09:00", morningEnd: "14:00", afternoonStart: "15:00", afternoonEnd: "20:00" },
    { dayId: 2, isActive: true, morningStart: "09:00", morningEnd: "14:00", afternoonStart: "15:00", afternoonEnd: "20:00" },
    { dayId: 3, isActive: true, morningStart: "09:00", morningEnd: "14:00", afternoonStart: "15:00", afternoonEnd: "20:00" },
    { dayId: 4, isActive: true, morningStart: "09:00", morningEnd: "14:00", afternoonStart: "15:00", afternoonEnd: "20:00" }
  ];

  const employees: Employee[] = [
    { id: "refuerzo_id", name: "Refuerzo", skills: ["peluqueria"], priority: 1, schedule: defaultSchedule }
  ];

  it('Caso Límite 1: El Sándwich Perfecto', () => {
    const service = { category: "peluqueria", phase1_min: 45, phase2_min: 60, phase3_min: 30 };
    const dayBookings = [
      { employee_id: "refuerzo_id", status: "confirmed", start_time: "09:00", end_time: "11:15", phase1_min: 45, phase2_min: 60, phase3_min: 30, isAppointment: true }
    ];

    const { occupied } = calculateAvailability(ALL_SLOTS, service, dayBookings, employees, date, false, 0);

    expect(occupied.has("09:00")).toBe(true);
    expect(occupied.has("09:15")).toBe(true);
    // 09:45 cabe porque es un sándwich (Ana está en espera)
    expect(occupied.has("09:45")).toBe(false); 
  });

  it('Caso Límite 2: Choque en la Fase 3 (Lavado saturado)', () => {
    const serviceCorte = { category: "peluqueria", duration_min: 30, phase1_min: 30, phase2_min: 0, phase3_min: 0 };
    const dayBookings = [
      { employee_id: "refuerzo_id", status: "confirmed", start_time: "09:00", end_time: "11:15", phase1_min: 45, phase2_min: 60, phase3_min: 30, isAppointment: true }
    ];

    const { occupied } = calculateAvailability(ALL_SLOTS, serviceCorte, dayBookings, employees, date, false, 0);

    expect(occupied.has("10:15")).toBe(false);
    // A las 10:30 no puede porque a las 11:00 (10:30 + 30) empieza el lavado del cliente 1 (que es a las 10:45)
    expect(occupied.has("10:30")).toBe(true); 
  });

  it('Caso Límite 3: Saturación de dos trabajadoras a la vez', () => {
    const twoEmployees: Employee[] = [
      { id: "ana", name: "Ana", skills: ["peluqueria"], priority: 1, schedule: defaultSchedule },
      { id: "refuerzo", name: "Refuerzo", skills: ["peluqueria"], priority: 2, schedule: defaultSchedule }
    ];
    const serviceCorte = { category: "peluqueria", duration_min: 30, phase1_min: 30, phase2_min: 0, phase3_min: 0 };
    
    const dayBookings = [
      { employee_id: "ana", status: "confirmed", start_time: "10:00", end_time: "10:30", phase1_min: 30, phase2_min: 0, phase3_min: 0, isAppointment: true },
      { employee_id: "refuerzo", status: "confirmed", start_time: "10:30", end_time: "11:00", phase1_min: 30, phase2_min: 0, phase3_min: 0, isAppointment: true }
    ];

    const { occupied } = calculateAvailability(ALL_SLOTS, serviceCorte, dayBookings, twoEmployees, date, false, 0);

    expect(occupied.has("10:00")).toBe(false); 
    expect(occupied.has("10:15")).toBe(true); 
  });

  it('Caso Límite 4: El falso hueco (Sándwich inverso)', () => {
    const onlyAna: Employee[] = [
      { id: "ana_id", name: "Ana", skills: ["peluqueria"], priority: 1, schedule: defaultSchedule }
    ];

    const dayBookings = [
      { employee_id: "ana_id", status: "confirmed", start_time: "09:00", end_time: "11:15", phase1_min: 45, phase2_min: 60, phase3_min: 30, isAppointment: true }
    ];
    const serviceLargo = { category: "peluqueria", duration_min: 90, phase1_min: 90, phase2_min: 0, phase3_min: 0 };
    
    const { occupied } = calculateAvailability(ALL_SLOTS, serviceLargo, dayBookings, onlyAna, date, false, 0);

    expect(occupied.has("09:45")).toBe(true);
  });

  it('Caso Límite 5: Encaje exacto (Fronteras de tiempo)', () => {
    // Sin buffer, si un cliente sale a las 10:00, el siguiente puede entrar a las 10:00.
    const onlyAna: Employee[] = [{ id: "ana", name: "Ana", skills: ["peluqueria"], priority: 1, schedule: defaultSchedule }];
    
    const dayBookings = [
      { employee_id: "ana", status: "confirmed", start_time: "09:30", end_time: "10:00", phase1_min: 30, phase2_min: 0, phase3_min: 0, isAppointment: true }
    ];
    const serviceNuevo = { category: "peluqueria", duration_min: 30, phase1_min: 30, phase2_min: 0, phase3_min: 0 };
    
    const { occupied } = calculateAvailability(ALL_SLOTS, serviceNuevo, dayBookings, onlyAna, date, false, 0);

    // 10:00 debe estar LIBRE (encaje perfecto)
    expect(occupied.has("10:00")).toBe(false);
  });

  it('Caso Límite 6: Sándwich Anidado Sin Buffer', () => {
    const onlyAna: Employee[] = [{ id: "ana", name: "Ana", skills: ["peluqueria"], priority: 1, schedule: defaultSchedule }];
    const dayBookings = [
      { employee_id: "ana", status: "confirmed", start_time: "09:00", end_time: "11:15", phase1_min: 45, phase2_min: 60, phase3_min: 30, isAppointment: true }
    ];
    
    const corteLargo = { category: "peluqueria", duration_min: 45, phase1_min: 45, phase2_min: 0, phase3_min: 0 };
    const { occupied } = calculateAvailability(ALL_SLOTS, corteLargo, dayBookings, onlyAna, date, false, 0);

    // 09:45 debe estar LIBRE (justo cuando Ana termina su P1 y el cliente 1 se va a esperar)
    expect(occupied.has("09:45")).toBe(false);
    // 10:00 también LIBRE
    expect(occupied.has("10:00")).toBe(false);
  });


  it('Caso Límite 7: Restricción de Habilidades', () => {
    const staff: Employee[] = [
      { id: "ana", name: "Ana", skills: ["peluqueria", "masajes"], priority: 1, schedule: defaultSchedule },
      { id: "refuerzo", name: "Refuerzo", skills: ["peluqueria"], priority: 2, schedule: defaultSchedule }
    ];

    const dayBookings = [
      { employee_id: "ana", status: "confirmed", start_time: "10:00", end_time: "10:30", phase1_min: 30, phase2_min: 0, phase3_min: 0, isAppointment: true }
    ];


    const masaje = { category: "masajes", duration_min: 30, phase1_min: 30, phase2_min: 0, phase3_min: 0 };
    const { occupied } = calculateAvailability(ALL_SLOTS, masaje, dayBookings, staff, date, false, 0);

    expect(occupied.has("10:00")).toBe(true);
  });

});