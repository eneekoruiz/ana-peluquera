import { Resend } from 'resend';
import { getFirebaseAdminApp } from './firebaseAdmin'; 
import { createAppointment, cancelAppointment, getBusySlots } from './googleCalendar'; 
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import crypto from 'node:crypto';
import { sendConfirmationEmail, sendCancellationEmail } from './notifications';

dayjs.extend(utc);
dayjs.extend(timezone);

const resend = new Resend(process.env.RESEND_API_KEY);

export interface BookingPayload {
  client_name: string;
  client_email: string;
  client_phone: string;
  service_id: string;
  service_name: string;
  date: string; // YYYY-MM-DD
  start_time: string; 
  end_time: string;
  notes?: string;
  lang?: string;
}

/**
 * Genera un hash SHA-256 de un token.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * 🔍 Obtiene los huecos ocupados para una fecha específica.
 * Usado por el panel de administración y el flujo de reserva.
 */
export async function getAvailableSlots(date: string) {
  const start = dayjs.tz(`${date}T00:00:00`, "Europe/Madrid").toDate();
  const end = dayjs.tz(`${date}T23:59:59`, "Europe/Madrid").toDate();
  const { busy } = await getBusySlots({ start, end });
  return busy;
}

export async function createBooking(data: BookingPayload) {
  const db = getFirebaseAdminApp().firestore();
  
  // 1. Verificar disponibilidad (Double-check)
  const startDateTime = dayjs.tz(`${data.date}T${data.start_time}:00`, "Europe/Madrid");
  const endDateTime = dayjs.tz(`${data.date}T${data.end_time}:00`, "Europe/Madrid");
  
  const { busy } = await getBusySlots({ 
    start: startDateTime.startOf('day').toDate(), 
    end: startDateTime.endOf('day').toDate() 
  });

  const hasConflict = busy.some(slot => {
    const s = dayjs(slot.start);
    const e = dayjs(slot.end);
    return (startDateTime.isBefore(e) && endDateTime.isAfter(s));
  });

  if (hasConflict) {
    throw new Error("SLOT_OCCUPIED");
  }

  // 2. Generar Token de Cancelación (Hashed para la DB)
  const rawCancelToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawCancelToken);

  // 3. Guardar en Firebase
  const bookingRef = await db.collection("bookings").add({
    ...data,
    status: 'confirmed',
    cancelToken: hashedToken, // Guardamos el HASH
    createdAt: new Date().toISOString(),
  });

  // 4. Sincronizar con Google Calendar
  try {
    const calendarResult = await createAppointment({
      start: startDateTime.toDate(),
      end: endDateTime.toDate(),
      serviceId: data.service_name,
      bookingId: bookingRef.id,
      customerName: data.client_name,
      customerPhone: data.client_phone,
      notes: `📞 ${data.client_phone}\n📧 ${data.client_email}\n📝 ${data.notes || ''}`,
    });

    await bookingRef.update({ googleEventId: calendarResult.eventId });
  } catch (error) {
    console.error("❌ Google Calendar Sync Error:", error);
    // No revertimos el booking, pero marcamos el error
    await bookingRef.update({ status: 'error', error: 'Google Sync Failed' });
  }

  // 5. Enviar Email (con el token RAW para el cliente)
  if (data.client_email) {
    try {
      await sendConfirmationEmail({
        to: data.client_email,
        customerName: data.client_name,
        serviceName: data.service_name,
        startTime: startDateTime.toISOString(),
        cancelToken: rawCancelToken, // Enviamos el RAW
      });
    } catch (error) {
      console.error("❌ Email Error:", error);
    }
  }

  return { id: bookingRef.id, cancelToken: rawCancelToken };
}

/**
 * Cancela una reserva validando el token (o forzando si es admin).
 */
export async function cancelBookingByToken(rawToken: string, isAdmin = false) {
  const db = getFirebaseAdminApp().firestore();
  const hashedToken = hashToken(rawToken);

  // Buscamos por el hash (o por el raw si es legacy)
  const snapshot = await db.collection("bookings")
    .where("status", "in", ["confirmed", "pending", "error"])
    .get();

  const bookingDoc = snapshot.docs.find(doc => {
    const data = doc.data();
    return data.cancelToken === hashedToken || data.cancelToken === rawToken;
  });

  if (!bookingDoc && !isAdmin) {
    throw new Error("INVALID_TOKEN");
  }

  const docToCancel = bookingDoc;
  if (!docToCancel) throw new Error("BOOKING_NOT_FOUND");

  const data = docToCancel.data();

  // Cancelar en Google
  if (data.googleEventId) {
    try {
      await cancelAppointment(data.googleEventId);
    } catch (e) {
      console.error("Google cancel error:", e);
    }
  }

  // Actualizar Firebase
  await docToCancel.ref.update({
    status: 'cancelled',
    cancelledAt: new Date().toISOString()
  });

  // Notificar
  if (data.client_email) {
    try {
      await sendCancellationEmail({
        to: data.client_email,
        customerName: data.client_name,
        serviceName: data.service_name,
        startTime: `${data.date}T${data.start_time}:00`
      });
    } catch (e) {
      console.error("Cancellation email error:", e);
    }
  }

  return { success: true };
}