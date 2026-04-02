import { Resend } from 'resend';
import { getFirebaseAdminApp } from './firebaseAdmin'; 
import { createAppointment, cancelAppointment, getBusySlots } from './googleCalendar'; 
import dayjs from 'dayjs';

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8080';

export interface BookingPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string; 
  startTime: string; 
  endTime: string;
}

export async function createBooking(data: BookingPayload) {
  const db = getFirebaseAdminApp().firestore();
  const cancelToken = crypto.randomUUID();
  const startDate = dayjs(data.startTime).toDate();
  const endDate = dayjs(data.endTime).toDate();

  // 1. VERIFICACIÓN DE ÚLTIMO SEGUNDO
  const checkDate = data.startTime.split('T')[0];
  const { busy } = await getBusySlots({ 
    start: dayjs(`${checkDate}T00:00:00Z`).toDate(), 
    end: dayjs(`${checkDate}T23:59:59Z`).toDate() 
  });
  
  const conflict = busy.some(slot => (dayjs(startDate).isBefore(slot.end) && dayjs(endDate).isAfter(slot.start)));
  if (conflict) throw new Error("Este hueco se acaba de ocupar. Elige otro.");

  // 2. BUSCAR INFO DEL SERVICIO (TU LÓGICA)
  const serviceDoc = await db.collection('services').doc(data.serviceName).get();
  const serviceInfo = serviceDoc.data();

  // 3. TRANSACCIÓN FIREBASE (ANTI-RACE CONDITION)
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
      start: startDate,
      end: endDate,
      serviceId: serviceInfo?.name || data.serviceName,
      bookingId: bookingRef.id,
      notes: `Cliente: ${data.customerName}\nTel: ${data.customerPhone}\nEmail: ${data.customerEmail}`,
      phase1Min: serviceInfo?.phase1Min,
      phase2Min: serviceInfo?.phase2Min,
      phase3Min: serviceInfo?.phase3Min,
    } as any);

    await bookingRef.update({ googleEventId: gcal.eventId });

    // ENVIAR EMAIL (TU LÓGICA)
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
    await bookingRef.delete(); // Borramos para no dejar citas fantasma
    throw new Error("No se pudo sincronizar con la agenda. Inténtalo de nuevo.");
  }
}

export async function cancelBookingByToken(token: string) {
  try {
    const db = getFirebaseAdminApp().firestore();
    const snapshot = await db.collection('bookings').where('cancelToken', '==', token).limit(1).get();
    if (snapshot.empty) throw new Error('No existe la reserva.');
    const doc = snapshot.docs[0];
    const data = doc.data();

    if (data.googleEventId) await cancelAppointment(data.googleEventId);
    await doc.ref.update({ status: 'cancelled', canceledAt: new Date().toISOString() });
    return { success: true };
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