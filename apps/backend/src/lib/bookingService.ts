import { Resend } from 'resend';
import { getFirebaseAdminApp } from './firebaseAdmin'; 
import { createAppointment, cancelAppointment, getBusySlots } from './googleCalendar'; 
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
// Importamos los idiomas para las fechas
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import 'dayjs/locale/eu';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8080';

export interface BookingPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId?: string;
  serviceName: string; 
  startTime: string; 
  endTime: string;
  notes?: string;
  lang?: string; // 👈 Añadimos el idioma al tipado
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
  
  const startDate = dayjs.tz(data.startTime, "Europe/Madrid");
  const endDate = dayjs.tz(data.endTime, "Europe/Madrid");
  const checkDate = startDate.format('YYYY-MM-DD');
  
  // Establecemos el idioma por defecto a español si no viene
  const userLang = data.lang === 'en' ? 'en' : data.lang === 'eu' ? 'eu' : 'es';

  // 1. VERIFICACIÓN DE ÚLTIMO SEGUNDO
  const { busy } = await getBusySlots({ 
    start: dayjs.tz(`${checkDate}T00:00:00`, "Europe/Madrid").toDate(), 
    end: dayjs.tz(`${checkDate}T23:59:59`, "Europe/Madrid").toDate() 
  });
  
  const conflict = busy.some(slot => (startDate.valueOf() < slot.end.valueOf() && endDate.valueOf() > slot.start.valueOf()));
  if (conflict) throw new Error("Este horario acaba de ser reservado. Por favor, elige otro.");

  // 2. BUSCAR INFO DEL SERVICIO
  const serviceRef = data.serviceId ? data.serviceId : data.serviceName;
  const serviceDoc = await db.collection('services').doc(serviceRef).get();
  const serviceInfo = serviceDoc.exists ? serviceDoc.data() : null;
  const finalServiceName = serviceInfo?.name || data.serviceName || "Servicio de Salón";

  // 3. TRANSACCIÓN FIREBASE BLINDADA
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
      lang: userLang, // Guardamos el idioma para futuras cancelaciones
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
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      notes: `Cliente: ${data.customerName}\nTel: ${data.customerPhone}\nEmail: ${data.customerEmail}\nIdioma: ${userLang.toUpperCase()}\nNotas: ${data.notes || ''}`,
      phase1Min: serviceInfo?.phase1Min,
      phase2Min: serviceInfo?.phase2Min,
      phase3Min: serviceInfo?.phase3Min,
    });

    await bookingRef.update({ googleEventId: gcal.eventId });

    // Preparar datos para el email con el idioma del usuario
    const cancelUrl = `${SITE_URL}/cancelar/${cancelToken}`;
    // Dayjs formatea la fecha en el idioma correcto automáticamente
    const formattedDate = startDate.locale(userLang).format('dddd, D MMMM YYYY'); 
    const formattedTime = startDate.format('HH:mm');

    const subjects = {
      es: `Reserva Confirmada: ${finalServiceName} - AG Beauty Salon`,
      en: `Booking Confirmed: ${finalServiceName} - AG Beauty Salon`,
      eu: `Hitzordua Baieztatuta: ${finalServiceName} - AG Beauty Salon`
    };

    // Enviar Email Multi-idioma
    await resend.emails.send({
      from: 'AG Beauty Salon <onboarding@resend.dev>', 
      to: data.customerEmail,
      subject: subjects[userLang as keyof typeof subjects],
      html: getConfirmationEmailHtml(data.customerName, finalServiceName, formattedDate, formattedTime, cancelUrl, userLang),
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
// ✉️ TEMPLATE DE EMAIL: Multi-idioma
// ============================================================================
function getConfirmationEmailHtml(name: string, service: string, date: string, time: string, cancelUrl: string, lang: string): string {
  
  // Diccionario de Traducciones
  const t = {
    es: {
      title: "Tu cita está confirmada",
      subtitle: `Hola ${name}, te esperamos en el salón.`,
      lblService: "Servicio", lblDate: "Fecha y Hora", lblLocation: "Ubicación",
      btn: "Gestionar o anular cita",
      policyTitle: "Política de cancelación",
      policy: "Si no puedes acudir, te rogamos que anules tu cita con al menos 24h de antelación utilizando el botón superior.",
      help: "¿Tienes dudas? Llámanos al",
      auto: "Este es un correo automático, por favor no respondas a esta dirección.",
      rgpd: "Cumplimiento RGPD: Tus datos son tratados únicamente para la gestión de esta reserva."
    },
    en: {
      title: "Your appointment is confirmed",
      subtitle: `Hello ${name}, we look forward to seeing you at the salon.`,
      lblService: "Service", lblDate: "Date & Time", lblLocation: "Location",
      btn: "Manage or cancel appointment",
      policyTitle: "Cancellation policy",
      policy: "If you cannot attend, please cancel your appointment at least 24h in advance using the button above.",
      help: "Any questions? Call us at",
      auto: "This is an automated email, please do not reply to this address.",
      rgpd: "GDPR Compliance: Your data is processed solely for managing this booking."
    },
    eu: {
      title: "Zure hitzordua baieztatuta dago",
      subtitle: `Kaixo ${name}, apaindegian itxaroten zaitugu.`,
      lblService: "Zerbitzua", lblDate: "Data eta Ordua", lblLocation: "Kokalekua",
      btn: "Hitzordua kudeatu edo ezeztatu",
      policyTitle: "Ezeztatzeko politika",
      policy: "Ezin bazara etorri, mesedez, ezeztatu zure hitzordua gutxienez 24 ordu lehenago goiko botoia erabiliz.",
      help: "Zalantzarik? Deitu hona:",
      auto: "Hau mezu automatiko bat da, mesedez ez erantzun.",
      rgpd: "DBEO Betetzea: Zure datuak hitzordu hau kudeatzeko soilik erabiltzen dira."
    }
  };

  const text = t[lang as keyof typeof t] || t['es'];

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${text.title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAFAFA; padding: 40px 20px;">
      <tr>
        <td align="center">
          
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #EAEAEA; overflow: hidden;">
            <tr>
              <td align="center" style="padding: 40px 40px 20px 40px;">
                <h1 style="margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #111111;">
                  AG Beauty Salon
                </h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 40px 30px 40px;">
                <h2 style="margin: 0; font-size: 24px; font-weight: 400; color: #111111; line-height: 1.3;">
                  ${text.title}
                </h2>
                <p style="margin: 10px 0 0 0; font-size: 15px; color: #666666;">
                  ${text.subtitle}
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 40px 30px 40px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8F6F4; border-radius: 8px; padding: 25px;">
                  <tr>
                    <td style="padding-bottom: 15px; border-bottom: 1px solid #EBE7E2;">
                      <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888888;">${text.lblService}</p>
                      <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 500; color: #111111;">${service}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 15px 0; border-bottom: 1px solid #EBE7E2;">
                      <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888888;">${text.lblDate}</p>
                      <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 500; color: #111111; text-transform: capitalize;">
                        ${date} - ${time}h
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 15px;">
                      <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888888;">${text.lblLocation}</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 400; color: #444444; line-height: 1.4;">
                        José María Salaberría 33<br>Donostia - San Sebastián
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 40px 40px 40px;">
                <a href="${cancelUrl}" style="display: inline-block; padding: 14px 28px; background-color: #111111; color: #FFFFFF; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; text-decoration: none; border-radius: 6px;">
                  ${text.btn}
                </a>
              </td>
            </tr>
          </table>

          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin-top: 20px;">
            <tr>
              <td align="center" style="padding: 0 20px;">
                <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.5;">
                  <strong>${text.policyTitle}:</strong> ${text.policy}
                </p>
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #999999;">
                  ${text.help} <a href="tel:+34943000000" style="color: #666666; text-decoration: none;">943 00 00 00</a>
                </p>
                <p style="margin: 15px 0 0 0; font-size: 10px; color: #BBBBBB;">
                  ${text.auto}<br>${text.rgpd}
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}