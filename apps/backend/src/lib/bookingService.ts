import { Resend } from 'resend';
import { getFirebaseAdminApp } from './firebaseAdmin'; 
import { createAppointment, cancelAppointment, getBusySlots } from './googleCalendar'; 
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import 'dayjs/locale/es';
import 'dayjs/locale/en';
import 'dayjs/locale/eu';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat); 

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8080';

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
  
  const startDate = dayjs.tz(`${data.date} ${data.start_time}`, "YYYY-MM-DD HH:mm", "Europe/Madrid");
  const endDate = dayjs.tz(`${data.date} ${data.end_time}`, "YYYY-MM-DD HH:mm", "Europe/Madrid");
  const userLang = data.lang === 'en' ? 'en' : data.lang === 'eu' ? 'eu' : 'es';

  const serviceDoc = await db.collection('services').doc(data.service_id).get();
  const serviceInfo = serviceDoc.exists ? serviceDoc.data() : null;
  const finalServiceName = serviceInfo?.name || "Servicio de Salón";

  const { busy } = await getBusySlots({ 
    start: dayjs.tz(`${data.date}T00:00:00`, "Europe/Madrid").toDate(), 
    end: dayjs.tz(`${data.date}T23:59:59`, "Europe/Madrid").toDate() 
  });

  const p1Min = Number(serviceInfo?.phase1_min || serviceInfo?.phase1Min || serviceInfo?.duration_min || serviceInfo?.durationMin || 0);
  const p2Min = Number(serviceInfo?.phase2_min || serviceInfo?.phase2Min || 0);
  const p3Min = Number(serviceInfo?.phase3_min || serviceInfo?.phase3Min || 0);

  const p1Start = startDate.valueOf();
  const p1End = startDate.add(p1Min, 'minute').valueOf();
  const p2End = startDate.add(p1Min + p2Min, 'minute').valueOf();
  const p3End = startDate.add(p1Min + p2Min + p3Min, 'minute').valueOf();

  const isOverlap = (s1: number, e1: number, s2: number, e2: number) => s1 < e2 && e1 > s2;

  let conflict = false;
  for (const slot of busy) {
    const bStart = slot.start.valueOf();
    const bEnd = slot.end.valueOf();
    const isWorking = slot.isAppointment === true;

    if (!isWorking) {
      if (isOverlap(p1Start, p1End, bStart, bEnd)) conflict = true;
      if (p2Min > 0 && isOverlap(p1End, p2End, bStart, bEnd)) conflict = true;
      if (p3Min > 0 && isOverlap(p2End, p3End, bStart, bEnd)) conflict = true;
    } else {
      if (isOverlap(p1Start, p1End, bStart, bEnd)) conflict = true;
      if (p3Min > 0 && isOverlap(p2End, p3End, bStart, bEnd)) conflict = true;
    }
  }

  if (conflict) throw new Error("Este horario acaba de ser reservado por otro cliente. Por favor, elige otro.");

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
      // 🚀 FIX: Devolvemos status a confirmed para que la web lo reconozca al cancelar
      status: 'confirmed', 
      createdAt: new Date().toISOString(), 
      duration_min: p1Min + p2Min + p3Min,
      lang: userLang,
      phase1_min: p1Min,
      phase2_min: p2Min,
      phase3_min: p3Min,
    });
  });

  try {
    const gcal = await createAppointment({
      start: startDate.toDate(),
      end: endDate.toDate(),
      serviceId: finalServiceName,
      bookingId: bookingRef.id,
      customerName: data.client_name,
      customerPhone: data.client_phone,
      notes: `Cliente: ${data.client_name}\nTel: ${data.client_phone}\nEmail: ${data.client_email}\nIdioma: ${userLang.toUpperCase()}\nNotas: ${data.notes || ''}`,
      phase1Min: p1Min,
      phase2Min: p2Min,
      phase3Min: p3Min,
    });

    await bookingRef.update({ googleEventId: gcal.eventId });

    const cancelUrl = `${SITE_URL}/cancelar/${cancelToken}`;
    const formattedDate = startDate.locale(userLang).format('D [de] MMMM YYYY'); 
    const formattedTime = startDate.format('HH:mm');

    const subjects = {
      es: `Reserva Confirmada: ${finalServiceName} - AG Beauty Salon`,
      en: `Booking Confirmed: ${finalServiceName} - AG Beauty Salon`,
      eu: `Hitzordua Baieztatuta: ${finalServiceName} - AG Beauty Salon`
    };

    await resend.emails.send({
      from: 'AG Beauty Salon <onboarding@resend.dev>', 
      to: data.client_email,
      subject: subjects[userLang as keyof typeof subjects],
      html: getProfessionalEmailHtml(data.client_name, finalServiceName, formattedDate, formattedTime, cancelUrl, userLang),
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
    const snapshot = await db.collection('bookings')
      .where('cancelToken', '==', token)
      .where('status', 'in', ['pending', 'confirmed'])
      .limit(1).get();
      
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
// ✉️ TEMPLATE DE EMAIL ULTRA-PROFESIONAL (A prueba de Outlook)
// ============================================================================
function getProfessionalEmailHtml(name: string, service: string, date: string, time: string, cancelUrl: string, lang: string): string {
  const t = {
    es: { subtitle: "RESERVA CONFIRMADA", hello: "Hola", text: "Tu cita ha sido agendada correctamente. A continuación, los detalles de tu reserva:", srv: "SERVICIO", dat: "FECHA", tim: "HORA", btn: "GESTIONAR CITA", call: "LLAMAR", wa: "WHATSAPP" },
    en: { subtitle: "BOOKING CONFIRMED", hello: "Hello", text: "Your appointment has been successfully scheduled. Below are the details of your booking:", srv: "SERVICE", dat: "DATE", tim: "TIME", btn: "MANAGE BOOKING", call: "CALL", wa: "WHATSAPP" },
    eu: { subtitle: "HITZORDUA BAIEZTATUTA", hello: "Kaixo", text: "Zure hitzordua behar bezala gorde da. Hemen dituzu xehetasunak:", srv: "ZERBITZUA", dat: "DATA", tim: "ORDUA", btn: "KUDEATU HITZORDUA", call: "DEITU", wa: "WHATSAPP" }
  };
  const txt = t[lang as keyof typeof t] || t.es;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>AG Beauty Salon</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f7f7f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f7f7f7; padding: 40px 15px;">
      <tr>
        <td align="center">
          <table width="100%" max-width="500" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; max-width: 500px; border: 1px solid #e5e5e5;">
            
            <tr>
              <td align="center" style="padding: 40px 30px 20px 30px;">
                <h1 style="margin: 0; font-size: 26px; font-weight: 300; letter-spacing: 6px; color: #000000;">A G</h1>
                <p style="margin: 8px 0 0 0; font-size: 10px; letter-spacing: 2px; color: #888888; text-transform: uppercase;">Beauty Salon</p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding: 0 30px;">
                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0;" />
              </td>
            </tr>

            <tr>
              <td style="padding: 30px;">
                <p style="margin: 0 0 10px 0; font-size: 10px; letter-spacing: 2px; color: #888888; text-transform: uppercase;">${txt.subtitle}</p>
                <p style="margin: 0 0 25px 0; font-size: 14px; color: #333333; line-height: 1.6;">${txt.hello} ${name},<br>${txt.text}</p>
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 4px; padding: 20px;">
                  <tr>
                    <td style="padding-bottom: 12px;">
                      <p style="margin: 0; font-size: 10px; letter-spacing: 1px; color: #888888; text-transform: uppercase;">${txt.srv}</p>
                      <p style="margin: 4px 0 0 0; font-size: 15px; color: #000000; font-weight: 500;">${service}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 12px; border-top: 1px solid #eeeeee; padding-top: 12px;">
                      <p style="margin: 0; font-size: 10px; letter-spacing: 1px; color: #888888; text-transform: uppercase;">${txt.dat}</p>
                      <p style="margin: 4px 0 0 0; font-size: 15px; color: #000000; font-weight: 500;">${date}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top: 1px solid #eeeeee; padding-top: 12px;">
                      <p style="margin: 0; font-size: 10px; letter-spacing: 1px; color: #888888; text-transform: uppercase;">${txt.tim}</p>
                      <p style="margin: 4px 0 0 0; font-size: 15px; color: #000000; font-weight: 500;">${time}h</p>
                    </td>
                  </tr>
                </table>

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 35px;">
                  <tr>
                    <td align="center">
                      <a href="${cancelUrl}" style="background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; display: inline-block; font-size: 12px; letter-spacing: 1px; font-weight: bold; border-radius: 2px;">${txt.btn}</a>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
            
            <tr>
              <td align="center" style="padding: 25px 30px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; font-size: 10px; color: #999999; letter-spacing: 1px; text-transform: uppercase;">JOSÉ MARÍA SALABERRÍA 33, DONOSTIA</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}