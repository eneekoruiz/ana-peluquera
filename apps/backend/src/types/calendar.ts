export type CalendarDateRange = {
  start: Date;
  end: Date;
};

export type BusyInterval = {
  start: Date;
  end: Date;
  sourceEventId?: string;
};

export type CreateAppointmentRequest = {
  bookingId: string;
  serviceId: string;
  start: Date;
  end: Date;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
  /** Sandwich booking phase 1 minutes (Active Work). */
  phase1Min?: number;
  /** Sandwich booking phase 2 minutes (Wait/Processing). Public availability ignores this by default. */
  phase2Min?: number;
  /** Sandwich booking phase 3 minutes (Active Finish). */
  phase3Min?: number;
  timeZone?: string;
};

