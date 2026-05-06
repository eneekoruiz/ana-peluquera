import { Resend } from 'resend';
import { getFirebaseAdminApp } from './firebaseAdmin'; 
import { createAppointment, cancelAppointment, getBusySlots } from './googleCalendar'; 
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import crypto from 'node:crypto';

import 'dayjs/locale/es';
import 'dayjs/locale/en';
import 'dayjs/locale/eu';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat); 

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8080';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ana@tudominio.com';

const timeToMinutes = (t: string) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * 🔒 Genera un hash SHA-256 para el cancelToken.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface BookingPayload {
  client_name: string;
  client_email?: string | null;
  client_phone: string;
  service_id: string;
  date: string;
  start_time: string; 
  end_time: string;
  notes?: string;
  lang?: string;
}

export async function createBooking(data: BookingPayload) {
  const db = getFirebaseAdminApp().firestore();
  
  // Generamos un token aleatorio seguro
  const rawToken = crypto.randomUUID();
  const hashedToken = hashToken(rawToken);
  
  const startDate = dayjs.tz(`${data.date} ${data.start_time}`, "YYYY-MM-DD HH:mm", "Europe/Madrid");
  const endDate = dayjs.tz(`${data.date} ${data.end_time}`, "YYYY-MM-DD HH:mm", "Europe/Madrid");
  const userLang = data.lang === 'en' ? 'en' : data.lang === 'eu' ? 'eu' : 'es';
  const safeClientEmail = data.client_email?.trim() || 'N/A';

  const serviceDoc = await db.collection('services').doc(data.service_id).get();
  const serviceInfo = serviceDoc.exists ? serviceDoc.data() : null;
  const finalServiceName = serviceInfo?.name || "Servicio de Salón";

  const { busy } = await getBusySlots({ 
    start: dayjs.tz(`${data.date}T00:00:00`, "Europe/Madrid").toDate(), 
    end: dayjs.tz(`${data.date}T23:59:59`, "Europe/Madrid").toDate() 
  }).catch(err => {
    if (err.message === "CALENDAR_DISCONNECTED") throw new Error("MAINTENANCE_MODE");
    throw err;
  });

  const p1Min = Number(serviceInfo?.phase1_min || serviceInfo?.phase1Min || serviceInfo?.duration_min || serviceInfo?.durationMin || 0);
  const p3Min = Number(serviceInfo?.phase3_min || serviceInfo?.phase3Min || 0);
  const p2Min = Number(serviceInfo?.phase2_min || serviceInfo?.phase2Min || 0);

  const sMin = timeToMinutes(data.start_time);
  const p1Start = sMin;
  const p1End = sMin + p1Min;
  const p2End = sMin + p1Min + p2Min;
  const p3End = sMin + p1Min + p2Min + p3Min;

  const isOverlap = (s1: number, e1: number, s2: number, e2: number) => s1 < e2 && e1 > s2;

  let conflict = false;
  for (const slot of busy) {
    const bStart = timeToMinutes(slot.start.format('HH:mm'));
    const bEnd = timeToMinutes(slot.end.format('HH:mm'));
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

  if (conflict) throw new Error("CONFLICT_ALREADY_BOOKED");

  const bookingRef = db.collection('bookings').doc();
  
  await db.runTransaction(async (transaction) => {
    transaction.set(bookingRef, {
      ...data,
      id: bookingRef.id,
      cancelToken: hashedToken, // 🔒 Guardamos solo el HASH
      status: 'confirmed', 
      createdAt: new Date().toISOString(), 
      duration_min: p1Min + p2Min + p3Min,
      lang: userLang,
      phase1_min: p1Min,
      phase2_min: p2Min,
      phase3_min: p3Min,
    });
  });

  const cancelUrl = `${SITE_URL}/cancelar/${rawToken}`;
  const formattedDate = startDate.locale(userLang).format('D [de] MMMM YYYY'); 
  const formattedTime = startDate.format('HH:mm');

  try {
    const gcal = await createAppointment({
      start: startDate.toDate(),
      end: endDate.toDate(),
      serviceId: finalServiceName,
      bookingId: bookingRef.id,
      customerName: data.client_name,
      customerPhone: data.client_phone,
      notes: `Cliente: ${data.client_name}\nTel: ${data.client_phone}\nEmail: ${safeClientEmail}\nNotas: ${data.notes || ''}`,
      phase1Min: p1Min,
      phase2Min: p2Min,
      phase3Min: p3Min,
    });
    await bookingRef.update({ googleEventId: gcal.eventId });
  } catch (error) {
    await bookingRef.update({ status: 'error', error: 'Google Sync Failed' });
    throw new Error("MAINTENANCE_MODE");
  }

  if (data.client_email && data.client_email.trim()) {
    const subjects = { 
      es: "Cita Confirmada", 
      en: "Booking Confirmed", 
      eu: "Hitzordua Baieztatuta" 
    };
    try {
      await resend.emails.send({
        from: 'AG Beauty Salon <onboarding@resend.dev>', 
        to: data.client_email,
        subject: `${subjects[userLang as keyof typeof subjects]} - AG Beauty Salon`,
        html: getProfessionalEmailHtml(data.client_name, finalServiceName, formattedDate, formattedTime, cancelUrl, userLang),
      });
    } catch (e) {}
  }

  return { success: true, bookingId: bookingRef.id };
}

export async function cancelBookingByToken(rawToken: string) {
  try {
    const db = getFirebaseAdminApp().firestore();
    const hashedToken = hashToken(rawToken);
    
    let snapshot = await db.collection('bookings')
      .where('cancelToken', '==', hashedToken)
      .where('status', 'in', ['pending', 'confirmed'])
      .limit(1).get();
      
    if (snapshot.empty) {
       snapshot = await db.collection('bookings')
        .where('cancelToken', '==', rawToken)
        .where('status', 'in', ['pending', 'confirmed'])
        .limit(1).get();
    }
      
    if (snapshot.empty) throw new Error('Invalid cancellation link.');
    
    const doc = snapshot.docs[0];
    const data = doc.data();

    if (data.googleEventId) {
      try { await cancelAppointment(data.googleEventId); } catch (err) { }
    }
    
    await doc.ref.update({ status: 'cancelled', canceledAt: new Date().toISOString() });
    return { success: true, message: 'Cita cancelada correctamente.' };
  } catch (e: any) { 
    return { success: false, message: e.message }; 
  }
}

function getProfessionalEmailHtml(name: string, service: string, date: string, time: string, cancelUrl: string, lang: string): string {
  const t = {
    es: { subtitle: "RESERVA CONFIRMADA", hello: "Hola", text: "Tu cita ha sido agendada correctamente. A continuación, los detalles de tu reserva:", srv: "SERVICIO", dat: "FECHA", tim: "HORA", btn: "GESTIONAR CITA" },
    en: { subtitle: "BOOKING CONFIRMED", hello: "Hello", text: "Your appointment has been successfully scheduled. Below are the details of your booking:", srv: "SERVICE", dat: "DATE", tim: "TIME", btn: "MANAGE BOOKING" },
    eu: { subtitle: "HITZORDUA BAIEZTATUTA", hello: "Kaixo", text: "Zure hitzordua behar bezala gorde da. Hemen dituzu xehetasunak:", srv: "ZERBITZUA", dat: "DATA", tim: "ORDUA", btn: "KUDEATU HITZORDUA" }
  };
  const txt = t[lang as keyof typeof t] || t.es;

  return `
  <!DOCTYPE html>
  <html>
  <body style="margin: 0; padding: 0; background-color: #f7f7f7; font-family: sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f7f7f7; padding: 40px 15px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; max-width: 500px; border: 1px solid #e5e5e5;">
            <tr>
              <td align="center" style="padding: 40px 30px 20px 30px;">
                <h1 style="margin: 0; font-size: 26px; font-weight: 300; letter-spacing: 6px; color: #000000;">A G</h1>
                <p style="margin: 8px 0 0 0; font-size: 10px; letter-spacing: 2px; color: #888888; text-transform: uppercase;">Beauty Salon</p>
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