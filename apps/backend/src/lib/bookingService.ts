import { Resend } from 'resend';
import { getFirebaseAdminApp } from './firebaseAdmin'; 
import { createAppointment, cancelAppointment, getBusySlots } from './googleCalendar'; 
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8080';

export interface BookingPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string; 
  startTime: string; 
  endTime: string;
  notes?: string;
}

export async function getAvailableSlots(date: string) {
  try {
    const start = dayjs.tz(`${date}T00:00:00`, "Europe/Madrid").toDate();
    const end = dayjs.tz(`${date}T23:59:59`, "Europe/Madrid").toDate();
    const response = await getBusySlots({ start, end });
    return response.busy;
  } catch (error) {
    throw new Error('No se pudo cargar la disponibilidad.');
  }
}

export async function createBooking(data: BookingPayload) {
  const db = getFirebaseAdminApp().firestore();
  // El polyfill de Node para randomUUID
  const cancelToken = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
  
  const startDate = dayjs.tz(data.startTime, "Europe/Madrid");
  const endDate = dayjs.tz(data.endTime, "Europe/Madrid");
  const checkDate = startDate.format('YYYY-MM-DD');

  // 1. VERIFICACIÓN DE ÚLTIMO SEGUNDO
  const { busy } = await getBusySlots({ 
    start: dayjs.tz(`${checkDate}T00:00:00`, "Europe/Madrid").toDate(), 
    end: dayjs.tz(`${checkDate}T23:59:59`, "Europe/Madrid").toDate() 
  });
  
  const conflict = busy.some(slot => (startDate.valueOf() < slot.end.valueOf() && endDate.valueOf() > slot.start.valueOf()));
  if (conflict) throw new Error("Este hueco se acaba de ocupar. Elige otro.");

  // 2. BUSCAR INFO DEL SERVICIO
  const serviceDoc = await db.collection('services').doc(data.serviceName).get();
  const serviceInfo = serviceDoc.data();

  // 3. TRANSACCIÓN FIREBASE
  const bookingRef = db.collection('bookings').doc();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(
      db.collection('bookings')
        .where('startTime', '==', data.startTime)
        .where('status', 'in', ['confirmed', 'pending'])
    );
    if (!snapshot.empty) throw new Error("Alguien se adelantó por milisegundos.");

    transaction.set(bookingRef, {
      ...data,
      id: bookingRef.id,
      cancelToken,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      phase1Min: serviceInfo?.phase1Min || 0,
      phase2Min: serviceInfo?.phase2Min || 0,
      phase3Min: serviceInfo?.phase3Min || 0,
    });
  });

  // 4. SINCRONIZACIÓN CON GOOGLE + EMAIL + ROLLBACK
  try {
    const gcal = await createAppointment({
      start: startDate.toDate(),
      end: endDate.toDate(),
      serviceId: serviceInfo?.name || data.serviceName,
      bookingId: bookingRef.id,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      notes: `Cliente: ${data.customerName}\nTel: ${data.customerPhone}\nEmail: ${data.customerEmail}\nNotas: ${data.notes || ''}`,
      phase1Min: serviceInfo?.phase1Min,
      phase2Min: serviceInfo?.phase2Min,
      phase3Min: serviceInfo?.phase3Min,
    });

    await bookingRef.update({ googleEventId: gcal.eventId });

    const cancelUrl = `${SITE_URL}/cancelar/${cancelToken}`;
    await resend.emails.send({
      from: 'AG Beauty Salon <onboarding@resend.dev>',
      to: data.customerEmail,
      subject: `Confirmación: ${serviceInfo?.name || data.serviceName}`,
      html: getConfirmationEmailHtml(data.customerName, serviceInfo?.name || data.serviceName, cancelUrl),
    });

    return { success: true, bookingId: bookingRef.id };

  } catch (error) {
    console.error("❌ Error en sincronización. Revirtiendo Firebase...");
    await bookingRef.delete();
    throw new Error("No se pudo sincronizar con la agenda. Inténtalo de nuevo.");
  }
}

export async function cancelBookingByToken(token: string) {
  try {
    const db = getFirebaseAdminApp().firestore();
    const snapshot = await db.collection('bookings').where('cancelToken', '==', token).where('status', '==', 'confirmed').limit(1).get();
    if (snapshot.empty) throw new Error('No existe la reserva.');
    const doc = snapshot.docs[0];
    const data = doc.data();

    if (data.googleEventId) await cancelAppointment(data.googleEventId);
    await doc.ref.update({ status: 'cancelled', canceledAt: new Date().toISOString() });
    return { success: true, message: 'Reserva anulada correctamente.' };
  } catch (e: any) { return { success: false, message: e.message }; }
}

function getConfirmationEmailHtml(customerName: string, serviceLabel: string, cancelUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
      <h2>¡Hola ${customerName}!</h2>
      <p>Tu cita para <strong>${serviceLabel}</strong> ha sido confirmada.</p>
      <a href="${cancelUrl}" style="background:#e11d48; color:#fff; padding:10px; text-decoration:none; border-radius:5px;">Anular cita</a>
    </div>
  `;
}