import { Resend } from 'resend';
import { getFirebaseAdminApp } from './firebaseAdmin'; 
import { createAppointment, cancelAppointment, getBusySlots } from './googleCalendar'; 
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Activamos los plugins para el control absoluto de horas
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

/**
 * 1. CONSULTAR DISPONIBILIDAD (Refactorizado con Day.js para evitar desfases)
 */
export async function getAvailableSlots(date: string) {
  try {
    const start = dayjs.tz(`${date}T00:00:00`, "Europe/Madrid").toDate();
    const end = dayjs.tz(`${date}T23:59:59`, "Europe/Madrid").toDate();

    const response = await getBusySlots({ start, end });
    return response.busy;
  } catch (error) {
    console.error('❌ Error consultando disponibilidad:', error);
    throw new Error('No se pudo cargar la disponibilidad.');
  }
}

/**
 * 2. CREAR RESERVA (Con Escudo Atómico, Lógica Sandwich y Rollback)
 */
export async function createBooking(data: BookingPayload) {
  const db = getFirebaseAdminApp().firestore();
  const cancelToken = crypto.randomUUID();

  // ----------------------------------------------------------------
  // 🛡️ ESCUDO 1: VERIFICACIÓN DE ÚLTIMO SEGUNDO (GOOGLE CALENDAR)
  // ----------------------------------------------------------------
  const startDate = dayjs.tz(data.startTime, "Europe/Madrid");
  const endDate = dayjs.tz(data.endTime, "Europe/Madrid");
  const checkDate = startDate.format('YYYY-MM-DD');

  const { busy } = await getBusySlots({ 
    start: dayjs.tz(`${checkDate}T00:00:00`, "Europe/Madrid").toDate(), 
    end: dayjs.tz(`${checkDate}T23:59:59`, "Europe/Madrid").toDate() 
  });

  const isOccupiedInGoogle = busy.some(slot => {
    return (startDate.valueOf() < slot.end.valueOf() && endDate.valueOf() > slot.start.valueOf());
  });

  if (isOccupiedInGoogle) {
    throw new Error("Este hueco acaba de ser ocupado en el salón o coincide con un festivo. Por favor, elige otra hora.");
  }

  // ----------------------------------------------------------------
  // 🔍 PASO PREVIO: Buscar la info del servicio en Firestore
  // ----------------------------------------------------------------
  const serviceDoc = await db.collection('services').doc(data.serviceName).get();
  if (!serviceDoc.exists) {
    console.warn(`⚠️ El servicio ${data.serviceName} no existe en Firestore.`);
  }
  const serviceInfo = serviceDoc.data();

  // ----------------------------------------------------------------
  // 🛡️ ESCUDO 2: TRANSACCIÓN ATÓMICA EN FIREBASE
  // ----------------------------------------------------------------
  const bookingRef = db.collection('bookings').doc();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(
      db.collection('bookings')
        .where('startTime', '==', data.startTime)
        .where('status', 'in', ['confirmed', 'pending'])
    );

    if (!snapshot.empty) {
      throw new Error("Lo sentimos, otro cliente acaba de confirmar esta reserva hace un instante.");
    }

    transaction.set(bookingRef, {
      ...data,
      id: bookingRef.id,
      cancelToken,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      // Lógica Sandwich guardada en Firebase
      phase1Min: serviceInfo?.phase1Min || 0,
      phase2Min: serviceInfo?.phase2Min || 0,
      phase3Min: serviceInfo?.phase3Min || 0,
    });
  });

  // ----------------------------------------------------------------
  // 🛡️ ESCUDO 3: SINCRONIZACIÓN (GOOGLE + EMAIL) Y ROLLBACK
  // ----------------------------------------------------------------
  try {
    const gcalResult = await createAppointment({
      start: startDate.toDate(),
      end: endDate.toDate(),
      serviceId: data.serviceName,
      bookingId: bookingRef.id,
      notes: `Servicio: ${serviceInfo?.name || data.serviceName}\nTel: ${data.customerPhone}\nEmail: ${data.customerEmail}\nNotas: ${data.notes || ''}`,
      // Inyectamos las fases obtenidas de la DB hacia Google
      phase1Min: serviceInfo?.phase1Min,
      phase2Min: serviceInfo?.phase2Min,
      phase3Min: serviceInfo?.phase3Min,
    } as any);

    await bookingRef.update({
      googleEventId: gcalResult.eventId,
      htmlLink: gcalResult.htmlLink || null
    });

    // Enviar Email de confirmación si todo fue bien
    const cancelUrl = `${SITE_URL}/cancelar/${cancelToken}`;
    await resend.emails.send({
      from: 'AG Beauty Salon <onboarding@resend.dev>', // ¡Recuerda cambiar esto por tu dominio verificado en prod!
      to: data.customerEmail,
      subject: `Confirmación de tu reserva: ${serviceInfo?.name || data.serviceName}`,
      html: getConfirmationEmailHtml(data.customerName, serviceInfo?.name || data.serviceName, cancelUrl),
    });

    return { success: true, bookingId: bookingRef.id };

  } catch (error) {
    // ☢️ PROTOCOLO DE EMERGENCIA: Si Google falla, borramos la reserva
    console.error("❌ Fallo en Google Calendar o Resend. Revirtiendo Firebase...", error);
    await bookingRef.delete();
    
    throw new Error("Hubo un problema sincronizando con la agenda del salón. Tu reserva no se ha completado. Por favor, inténtalo de nuevo.");
  }
}

/**
 * 3. ANULAR RESERVA
 */
export async function cancelBookingByToken(token: string) {
  try {
    const db = getFirebaseAdminApp().firestore();
    
    const snapshot = await db.collection('bookings')
      .where('cancelToken', '==', token)
      .where('status', '==', 'confirmed')
      .limit(1)
      .get();

    if (snapshot.empty) throw new Error('Reserva no encontrada.');

    const bookingDoc = snapshot.docs[0];
    const bookingData = bookingDoc.data();

    // Borramos de Google Calendar si existe
    if (bookingData.googleEventId) {
      await cancelAppointment(bookingData.googleEventId);
    }

    // Actualizamos el estado en Firebase a cancelado
    await bookingDoc.ref.update({
      status: 'cancelled',
      canceledAt: new Date().toISOString(),
    });

    return { success: true, message: 'Reserva anulada correctamente.' };
  } catch (error: any) {
    console.error('❌ Error anulando reserva:', error);
    return { success: false, message: error.message };
  }
}

// ============================================================================
// HELPERS (El HTML del email)
// ============================================================================
function getConfirmationEmailHtml(customerName: string, serviceLabel: string, cancelUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border-radius: 10px; border: 1px solid #eee;">
      <h2 style="color: #111;">¡Hola ${customerName}!</h2>
      <p>Tu cita para <strong>${serviceLabel}</strong> ha sido confirmada.</p>
      <p style="background: #f9f9f9; padding: 10px; border-radius: 5px;">
        📍 <strong>Lugar:</strong> José María Salaberria 33, Donostia
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 13px; color: #666;">Si necesitas cancelar, usa este enlace:</p>
      <a href="${cancelUrl}" style="display:inline-block; padding:10px 20px; background-color:#e11d48; color:#fff; text-decoration:none; border-radius:5px; font-weight: bold;">
        Anular mi reserva
      </a>
    </div>
  `;
}