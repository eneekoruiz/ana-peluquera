import { Resend } from 'resend';
import { getFirebaseAdminApp } from './firebaseAdmin'; 
import { createAppointment, cancelAppointment, getBusySlots } from './googleCalendar'; 
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Importamos los idiomas para las fechas
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import 'dayjs/locale/eu';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat); // Vital para que no haya desfase de 2 horas

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8080';

// 🚀 FIX: Tipado exacto que coincide con lo que envía el Frontend (Reservation.tsx)
export interface BookingPayload {
  client_name: string;
  client_email: string;
  client_phone: string;
  service_id: string;
  date: string;
  start_time: string; 
  end_time: string;
  notes?: string;
  lang?: string;
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
  
  const cancelToken = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // 🚀 FIX ZONA HORARIA: Juntamos la fecha y la hora explícitamente y forzamos Madrid
  const startDate = dayjs.tz(`${data.date} ${data.start_time}`, "YYYY-MM-DD HH:mm", "Europe/Madrid");
  const endDate = dayjs.tz(`${data.date} ${data.end_time}`, "YYYY-MM-DD HH:mm", "Europe/Madrid");
  
  const userLang = data.lang === 'en' ? 'en' : data.lang === 'eu' ? 'eu' : 'es';

  // 1. VERIFICACIÓN DE ÚLTIMO SEGUNDO
  const { busy } = await getBusySlots({ 
    start: dayjs.tz(`${data.date}T00:00:00`, "Europe/Madrid").toDate(), 
    end: dayjs.tz(`${data.date}T23:59:59`, "Europe/Madrid").toDate() 
  });
  
  const conflict = busy.some(slot => (startDate.valueOf() < slot.end.valueOf() && endDate.valueOf() > slot.start.valueOf()));
  if (conflict) throw new Error("Este horario acaba de ser reservado. Por favor, elige otro.");

  // 2. BUSCAR INFO DEL SERVICIO
  const serviceDoc = await db.collection('services').doc(data.service_id).get();
  const serviceInfo = serviceDoc.exists ? serviceDoc.data() : null;
  const finalServiceName = serviceInfo?.name || "Servicio de Salón";

  // 3. TRANSACCIÓN FIREBASE BLINDADA
  const bookingRef = db.collection('bookings').doc();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(
      db.collection('bookings')
        .where('date', '==', data.date)
        .where('start_time', '==', data.start_time)
        .where('status', 'in', ['confirmed', 'pending'])
    );
    if (!snapshot.empty) throw new Error("Alguien se adelantó por milisegundos.");

    transaction.set(bookingRef, {
      ...data,
      id: bookingRef.id,
      cancelToken,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      lang: userLang,
      phase1Min: serviceInfo?.phase1Min || 0,
      phase2Min: serviceInfo?.phase2Min || 0,
      phase3Min: serviceInfo?.phase3Min || 0,
    });
  });

  // 4. SINCRONIZACIÓN CON GOOGLE + EMAIL
  try {
    const gcal = await createAppointment({
      start: startDate.toDate(),
      end: endDate.toDate(),
      serviceId: finalServiceName,
      bookingId: bookingRef.id,
      customerName: data.client_name,
      customerPhone: data.client_phone,
      notes: `Cliente: ${data.client_name}\nTel: ${data.client_phone}\nEmail: ${data.client_email}\nIdioma: ${userLang.toUpperCase()}\nNotas: ${data.notes || ''}`,
      phase1Min: serviceInfo?.phase1Min,
      phase2Min: serviceInfo?.phase2Min,
      phase3Min: serviceInfo?.phase3Min,
    });

    await bookingRef.update({ googleEventId: gcal.eventId });

    // Preparar datos para el email
    const cancelUrl = `${SITE_URL}/cancelar/${cancelToken}`;
    const formattedDate = startDate.locale(userLang).format('dddd, D [de] MMMM YYYY'); 
    const formattedTime = startDate.format('HH:mm');

    const subjects = {
      es: `Reserva Confirmada: ${finalServiceName} - AG Beauty Salon`,
      en: `Booking Confirmed: ${finalServiceName} - AG Beauty Salon`,
      eu: `Hitzordua Baieztatuta: ${finalServiceName} - AG Beauty Salon`
    };

    // Enviar Email Premium Multi-idioma
    await resend.emails.send({
      from: 'AG Beauty Salon <onboarding@resend.dev>', // ¡Cámbialo por tu dominio real cuando salgas a producción!
      to: data.client_email,
      subject: subjects[userLang as keyof typeof subjects],
      html: getConfirmationEmailHtml(data.client_name, finalServiceName, formattedDate, formattedTime, cancelUrl, userLang),
    });

    return { success: true, bookingId: bookingRef.id };

  } catch (error) {
    console.error("❌ Error en sincronización. Revirtiendo Firebase...");
    await bookingRef.delete(); 
    throw new Error("No se pudo completar la reserva. Por favor, inténtalo de nuevo.");
  }
}

export async function cancelBookingByToken(token: string) {
  try {
    const db = getFirebaseAdminApp().firestore();
    const snapshot = await db.collection('bookings').where('cancelToken', '==', token).where('status', '==', 'confirmed').limit(1).get();
    if (snapshot.empty) throw new Error('El enlace de cancelación ha caducado o no existe.');
    
    const doc = snapshot.docs[0];
    const data = doc.data();

    if (data.googleEventId) {
      try { await cancelAppointment(data.googleEventId); } catch (err) { }
    }
    
    await doc.ref.update({ status: 'cancelled', canceledAt: new Date().toISOString() });
    return { success: true, message: 'Tu cita ha sido anulada correctamente.' };
  } catch (e: any) { 
    return { success: false, message: e.message }; 
  }
}

// ============================================================================
// ✉️ TEMPLATE DE EMAIL: Premium Awwwards & Multi-idioma
// ============================================================================
function getConfirmationEmailHtml(name: string, service: string, date: string, time: string, cancelUrl: string, lang: string): string {
  const t = {
    es: { title: "Cita Confirmada", subtitle: `Hola ${name}, te esperamos en el salón.`, btnCancel: "GESTIONAR CITA", call: "LLAMAR", wa: "WHATSAPP" },
    en: { title: "Booking Confirmed", subtitle: `Hello ${name}, we look forward to seeing you.`, btnCancel: "MANAGE BOOKING", call: "CALL", wa: "WHATSAPP" },
    eu: { title: "Hitzordua Baieztatuta", subtitle: `Kaixo ${name}, apaindegian itxaroten zaitugu.`, btnCancel: "KUDEATU HITZORDUA", call: "DEITU", wa: "WHATSAPP" }
  };
  const text = t[lang as keyof typeof t] || t.es;

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin: 0; padding: 0; background-color: #FDFDFD; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width: 500px; background-color: #ffffff; border: 1px solid #eeeeee;">
            <tr>
              <td align="center" style="padding: 40px 40px 10px 40px;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 300; letter-spacing: 5px; color: #111;">A G</h1>
                <p style="margin: 5px 0 0 0; font-size: 10px; letter-spacing: 3px; color: #999; text-transform: uppercase;">Beauty Salon</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px;">
                <h2 style="font-size: 20px; font-weight: 400; color: #111; margin-bottom: 10px;">${text.title}</h2>
                <p style="font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 30px;">${text.subtitle}</p>
                
                <div style="border-left: 2px solid #111; padding-left: 20px; margin-bottom: 40px;">
                  <p style="margin: 0; font-size: 11px; color: #999; letter-spacing: 1px;">SERVICIO</p>
                  <p style="margin: 5px 0 15px 0; font-size: 16px; color: #111;">${service}</p>
                  <p style="margin: 0; font-size: 11px; color: #999; letter-spacing: 1px;">CUÁNDO</p>
                  <p style="margin: 5px 0 0 0; font-size: 16px; color: #111; text-transform: capitalize;">${date} — ${time}h</p>
                </div>

                <a href="${cancelUrl}" style="display: block; text-align: center; padding: 16px; background-color: #111; color: #fff; text-decoration: none; font-size: 12px; letter-spacing: 2px; font-weight: 500; margin-bottom: 40px;">${text.btnCancel}</a>

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #eee; padding-top: 30px;">
                  <tr>
                    <td width="50%" align="center">
                      <a href="tel:+34943000000" style="text-decoration: none; color: #111; font-size: 11px; letter-spacing: 1px;"><strong>${text.call}</strong></a>
                    </td>
                    <td width="50%" align="center">
                      <a href="https://wa.me/34943000000" style="text-decoration: none; color: #111; font-size: 11px; letter-spacing: 1px;"><strong>${text.wa}</strong></a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin-top: 30px; font-size: 10px; color: #bbb; letter-spacing: 1px;">JOSÉ MARÍA SALABERRÍA 33, DONOSTIA</p>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}