import { Resend } from 'resend';
import { getFirebaseAdminApp } from './firebaseAdmin'; 
import { createAppointment, cancelAppointment, getBusySlots } from './googleCalendar'; 

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8080';

export interface BookingPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string; // Este es el ID del documento en la colección 'services'
  startTime: string; 
  endTime: string;
}

/**
 * 1. CONSULTAR DISPONIBILIDAD
 */
export async function getAvailableSlots(date: string) {
  try {
    const start = new Date(`${date}T00:00:00Z`);
    const end = new Date(`${date}T23:59:59Z`);

    const response = await getBusySlots({ start, end });
    return response.busy;
  } catch (error) {
    console.error('❌ Error consultando disponibilidad:', error);
    throw new Error('No se pudo cargar la disponibilidad.');
  }
}

/**
 * 2. CREAR RESERVA (Ahora lee el servicio de Firestore)
 */
export async function createBooking(data: BookingPayload) {
  try {
    const db = getFirebaseAdminApp().firestore();
    const cancelToken = crypto.randomUUID();

    // 🔍 PASO NUEVO: Buscamos la info del servicio directamente en Firestore
    // Usamos data.serviceName como ID del documento (ej: "corte-pelo")
    const serviceDoc = await db.collection('services').doc(data.serviceName).get();
    
    if (!serviceDoc.exists) {
       console.warn(`⚠️ El servicio ${data.serviceName} no existe en Firestore.`);
    }
    
    const serviceInfo = serviceDoc.data();

    // Paso A: Guardar la reserva en Firestore
    const docRef = await db.collection('bookings').add({
      ...data,
      cancelToken,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      // Usamos los campos que definiste en Firebase (asegúrate que se llamen igual)
      phase1Min: serviceInfo?.phase1Min || 0,
      phase2Min: serviceInfo?.phase2Min || 0,
      phase3Min: serviceInfo?.phase3Min || 0,
    });

    // Paso B: Insertar en Google Calendar con lógica Sandwich
    const calendarResult = await createAppointment({
      start: new Date(data.startTime),
      end: new Date(data.endTime),
      notes: `Servicio: ${serviceInfo?.name || data.serviceName}\nTel: ${data.customerPhone}\nEmail: ${data.customerEmail}`,
      bookingId: docRef.id,
      serviceId: data.serviceName,
      // Inyectamos las fases obtenidas de la DB
      phase1Min: serviceInfo?.phase1Min,
      phase2Min: serviceInfo?.phase2Min,
      phase3Min: serviceInfo?.phase3Min,
    } as any);

    const googleEventId = calendarResult.eventId;

    // Paso C: Actualizar Firebase con el ID de Google
    await docRef.update({ googleEventId });

    // Paso D: Email de confirmación
    const cancelUrl = `${SITE_URL}/cancelar/${cancelToken}`;
    await resend.emails.send({
      from: 'AG Beauty Salon <onboarding@resend.dev>',
      to: data.customerEmail,
      subject: `Confirmación de tu reserva: ${serviceInfo?.name || data.serviceName}`,
      html: getConfirmationEmailHtml(data.customerName, serviceInfo?.name || data.serviceName, cancelUrl),
    });

    return { success: true, bookingId: docRef.id };
  } catch (error) {
    console.error('❌ Error creando reserva:', error);
    throw new Error('No se pudo completar la reserva.');
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

    if (bookingData.googleEventId) {
      await cancelAppointment(bookingData.googleEventId);
    }

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

// HELPERS (El HTML del email)
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