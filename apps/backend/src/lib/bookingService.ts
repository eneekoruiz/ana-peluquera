import { Resend } from 'resend';
import { getFirebaseAdminApp } from './firebaseAdmin'; 
import { createAppointment, cancelAppointment, getBusySlots } from './googleCalendar'; 
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import crypto from 'node:crypto';
import { sendConfirmationEmail, sendCancellationEmail, sendAdminAlert } from './notifications';

dayjs.extend(utc);
dayjs.extend(timezone);

const resend = new Resend(process.env.RESEND_API_KEY);

export interface BookingPayload {
  client_name: string;
  client_email?: string | null;
  client_phone: string;
  service_id: string;
  service_name?: string; // Optional here as we can fetch it
  date: string; // YYYY-MM-DD
  start_time: string; 
  end_time: string;
  notes?: string;
  lang?: string;
}

const timeToMinutes = (t: string) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const isOverlap = (s1: number, e1: number, s2: number, e2: number) => s1 < e2 && e1 > s2;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * 🔍 Obtiene los huecos ocupados para una fecha específica.
 */
export async function getAvailableSlots(date: string) {
  try {
    const start = dayjs.tz(`${date}T00:00:00`, "Europe/Madrid").toDate();
    const end = dayjs.tz(`${date}T23:59:59`, "Europe/Madrid").toDate();
    const response = await getBusySlots({ start, end });
    return response.busy;
  } catch (error: any) {
    if (error.message === "CALENDAR_DISCONNECTED") throw new Error("MAINTENANCE_MODE");
    throw new Error('No se pudo cargar la disponibilidad.');
  }
}

/**
 * 🚀 Crea una reserva con lógica de fases (Smart Booking) y transacción atómica.
 */
export async function createBooking(data: BookingPayload) {
  const db = getFirebaseAdminApp().firestore();
  const userLang = data.lang === 'en' ? 'en' : data.lang === 'eu' ? 'eu' : 'es';
  
  // 1. Obtener info del servicio para las fases
  const serviceDoc = await db.collection('services').doc(data.service_id).get();
  if (!serviceDoc.exists) throw new Error("SERVICE_NOT_FOUND");
  const sInfo = serviceDoc.data()!;
  
  const p1Min = Number(sInfo.phase1_min || sInfo.phase1Min || sInfo.duration_min || 0);
  const p2Min = Number(sInfo.phase2_min || sInfo.phase2Min || 0);
  const p3Min = Number(sInfo.phase3_min || sInfo.phase3Min || 0);
  const serviceName = sInfo.name || "Servicio";

  const sMin = timeToMinutes(data.start_time);
  const p1Start = sMin;
  const p1End = sMin + p1Min;
  const p2End = p1End + p2Min;
  const p3End = p2End + p3Min;

  // 2. Verificar disponibilidad REAL con Google (Phases aware)
  const { busy } = await getBusySlots({ 
    start: dayjs.tz(`${data.date}T00:00:00`, "Europe/Madrid").toDate(), 
    end: dayjs.tz(`${data.date}T23:59:59`, "Europe/Madrid").toDate() 
  }).catch(err => {
    if (err.message === "CALENDAR_DISCONNECTED") throw new Error("MAINTENANCE_MODE");
    throw err;
  });

  for (const slot of busy) {
    const bStart = timeToMinutes(slot.start.format('HH:mm'));
    const bEnd = timeToMinutes(slot.end.format('HH:mm'));
    const isAppointment = slot.isAppointment === true;

    // Lógica Smart: Si es un bloqueo manual, nada entra. Si es una cita, P2 es libre.
    if (!isAppointment) {
      if (isOverlap(p1Start, p1End, bStart, bEnd)) throw new Error("SLOT_OCCUPIED");
      if (p2Min > 0 && isOverlap(p1End, p2End, bStart, bEnd)) throw new Error("SLOT_OCCUPIED");
      if (p3Min > 0 && isOverlap(p2End, p3End, bStart, bEnd)) throw new Error("SLOT_OCCUPIED");
    } else {
      if (isOverlap(p1Start, p1End, bStart, bEnd)) throw new Error("SLOT_OCCUPIED");
      if (p3Min > 0 && isOverlap(p2End, p3End, bStart, bEnd)) throw new Error("SLOT_OCCUPIED");
    }
  }

  // 3. Transacción en Firebase para evitar race conditions
  const bookingRef = db.collection('bookings').doc();
  const rawCancelToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawCancelToken);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(
      db.collection('bookings')
        .where('date', '==', data.date)
        .where('status', '==', 'confirmed')
    );
    
    for (const ebDoc of snapshot.docs) {
      const eb = ebDoc.data();
      const ebStart = timeToMinutes(eb.start_time);
      const ebEnd = timeToMinutes(eb.end_time);
      
      if (isOverlap(p1Start, p1End, ebStart, ebEnd)) throw new Error("SLOT_OCCUPIED");
      if (p3Min > 0 && isOverlap(p2End, p3End, ebStart, ebEnd)) throw new Error("SLOT_OCCUPIED");
    }

    transaction.set(bookingRef, {
      ...data,
      id: bookingRef.id,
      service_name: serviceName,
      cancelToken: hashedToken,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      phase1_min: p1Min,
      phase2_min: p2Min,
      phase3_min: p3Min,
    });
  });

  // 4. Sincronización con Google Calendar
  const startDT = dayjs.tz(`${data.date} ${data.start_time}`, "YYYY-MM-DD HH:mm", "Europe/Madrid");
  const endDT = dayjs.tz(`${data.date} ${data.end_time}`, "YYYY-MM-DD HH:mm", "Europe/Madrid");

  try {
    const gcal = await createAppointment({
      start: startDT.toDate(),
      end: endDT.toDate(),
      serviceId: serviceName,
      bookingId: bookingRef.id,
      customerName: data.client_name,
      customerPhone: data.client_phone,
      notes: `📝 ${data.notes || ''}\n📞 ${data.client_phone}\n📧 ${data.client_email || 'N/A'}`,
      phase1Min: p1Min,
      phase2Min: p2Min,
      phase3Min: p3Min,
    });

    await bookingRef.update({ googleEventId: gcal.eventId });
  } catch (error: any) {
    console.error("❌ Fallo Google Calendar:", error);
    
    // Marcar error en Firebase
    await bookingRef.update({ status: 'error', error: 'Google Sync Failed' });

    // Alerta urgente a Ana
    await sendAdminAlert({
      clientName: data.client_name,
      date: data.date,
      time: data.start_time,
      error: error.message || "Fallo desconocido en Google Calendar"
    }).catch(e => console.error("Tampoco se pudo avisar a Ana:", e));

    throw new Error("MAINTENANCE_MODE");
  }

  // 5. Email al cliente (Solo si Google fue OK)
  if (data.client_email) {
    try {
      await sendConfirmationEmail({
        to: data.client_email,
        customerName: data.client_name,
        serviceName: serviceName,
        startTime: startDT.toISOString(),
        cancelToken: rawCancelToken,
        lang: userLang
      });
    } catch (e) {
      console.error("Fallo email cliente:", e);
    }
  }

  return { id: bookingRef.id, cancelToken: rawCancelToken };
}

/**
 * 🗑️ Cancelación unificada con SHA-256 y legacy support.
 */
export async function cancelBookingByToken(rawToken: string, isAdmin = false) {
  const db = getFirebaseAdminApp().firestore();
  const hashedToken = hashToken(rawToken);

  const snapshot = await db.collection("bookings")
    .where("status", "in", ["confirmed", "pending", "error"])
    .get();

  const bookingDoc = snapshot.docs.find(doc => {
    const d = doc.data();
    return d.cancelToken === hashedToken || d.cancelToken === rawToken;
  });

  if (!bookingDoc && !isAdmin) throw new Error("INVALID_TOKEN");
  if (!bookingDoc) throw new Error("BOOKING_NOT_FOUND");

  const data = bookingDoc.data();

  if (data.googleEventId) {
    try { await cancelAppointment(data.googleEventId); } catch (e) {}
  }

  await bookingDoc.ref.update({
    status: 'cancelled',
    cancelledAt: new Date().toISOString()
  });

  if (data.client_email) {
    try {
      await sendCancellationEmail({
        to: data.client_email,
        customerName: data.client_name,
        serviceName: data.service_name,
        startTime: `${data.date}T${data.start_time}:00`,
        lang: data.lang
      });
    } catch (e) {}
  }

  return { success: true };
}