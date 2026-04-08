import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { createBooking } from '@/lib/bookingService'; 
import { getBusySlots, cancelAppointment } from '@/lib/googleCalendar';
import { Resend } from 'resend';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { z } from 'zod';

dayjs.extend(utc);
dayjs.extend(timezone);

const resend = new Resend(process.env.RESEND_API_KEY);
const TZ = "Europe/Madrid";
const SALON_PHONE = "34843673595";
const PERSONAL_PHONE = "34645006964";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_SITE_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateStore: Map<string, RateLimitEntry> =
  (globalThis as { __bookingsRateStore?: Map<string, RateLimitEntry> }).__bookingsRateStore ||
  new Map<string, RateLimitEntry>();

(globalThis as { __bookingsRateStore?: Map<string, RateLimitEntry> }).__bookingsRateStore = rateStore;

const bookingSchema = z.object({
  client_name: z.string().trim().min(2).max(120),
  client_email: z.string().trim().email().optional().nullable().or(z.literal('')),
  client_phone: z.string().trim().min(9).max(25),
  service_id: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(1000).optional(),
  lang: z.enum(['es', 'en', 'eu']).optional(),
});

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : (ALLOWED_ORIGINS[0] || '*');

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
}

function isRateLimited(request: Request, scope: string): boolean {
  const key = `${scope}:${getClientIp(request)}`;
  const now = Date.now();
  const entry = rateStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  rateStore.set(key, entry);
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

async function sendCancellationEmail(email: string, name: string, date: string, time: string, lang: string) {
  const t = {
    es: { title: "Cita Cancelada", msg: `Hola ${name}, te informamos que tu cita ha sido cancelada.`, help: "Si quieres reservar otra fecha, contáctanos:", call: "LLAMAR", wa: "WHATSAPP" },
    en: { title: "Booking Cancelled", msg: `Hello ${name}, we inform you that your appointment has been cancelled.`, help: "To reschedule, please contact us:", call: "CALL", wa: "WHATSAPP" },
    eu: { title: "Hitzordua Ezeztatuta", msg: `Kaixo ${name}, zure hitzordua ezeztatu dela jakinarazten dizugu.`, help: "Beste egun bat hartzeko, jarri gurekin harremanetan:", call: "DEITU", wa: "WHATSAPP" }
  };
  const text = t[lang as keyof typeof t] || t.es;

  try {
    await resend.emails.send({
      from: 'AG Beauty Salon <onboarding@resend.dev>',
      to: email,
      subject: `${text.title} - AG Beauty Salon`,
      html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #FDFDFD; font-family: sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 500px; background-color: #ffffff; border: 1px solid #eeeeee;">
                <tr>
                  <td align="center" style="padding: 40px 40px 10px 40px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 300; letter-spacing: 5px; color: #111;">A G</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="font-size: 20px; font-weight: 400; color: #e11d48; margin-bottom: 10px;">${text.title}</h2>
                    <p style="font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 30px;">${text.msg}</p>
                    
                    <div style="background-color: #fafafa; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; font-size: 12px; color: #111;"><strong>Cita original:</strong> ${date} a las ${time}h</p>
                    </div>

                    <p style="font-size: 12px; color: #999; margin-bottom: 20px; text-align: center;">${text.help}</p>

                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" align="center">
                          <a href="tel:+${SALON_PHONE}" style="display: block; margin: 0 5px; padding: 12px; border: 1px solid #111; color: #111; text-decoration: none; font-size: 11px; letter-spacing: 1px;">${text.call}</a>
                        </td>
                        <td width="50%" align="center">
                          <a href="https://wa.me/${PERSONAL_PHONE}" style="display: block; margin: 0 5px; padding: 12px; background-color: #111; color: #fff; text-decoration: none; font-size: 11px; letter-spacing: 1px;">${text.wa}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`
    });
  } catch (e) { console.error("Error email cancelación:", e); }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

export async function GET(request: Request) {
  const headers = getCorsHeaders(request);
  if (isRateLimited(request, 'bookings-get')) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429, headers });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'Falta fecha' }, { status: 400, headers });

  try {
    const db = getFirebaseAdminApp().firestore();
    const fbSnap = await db.collection('bookings').where('date', '==', date).get();
    const firebaseBookings = fbSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    const start = dayjs.tz(`${date}T00:00:00`, TZ).toDate();
    const end = dayjs.tz(`${date}T23:59:59`, TZ).subtract(1, 'ms').toDate();
    
    const { busy, rawEventIds } = await getBusySlots({ start, end });

    const googleEventIds = new Set(rawEventIds);
    const cleanWebBookings = [];

    for (const booking of firebaseBookings) {
      const minutesSinceCreation = dayjs().diff(dayjs(booking.createdAt || booking.created_at), 'minute');
      const existsInGoogle = booking.googleEventId && googleEventIds.has(booking.googleEventId);

      if (booking.googleEventId && !existsInGoogle && minutesSinceCreation > 10) {
        console.log(`🧹 Auto-limpieza activa: Borrando ${booking.id} y enviando email...`);
        
        if (booking.client_email) {
          await sendCancellationEmail(
            booking.client_email, 
            booking.client_name || booking.customerName, 
            booking.date, 
            booking.start_time || booking.startTime,
            booking.lang || 'es'
          );
        }
        await db.collection('bookings').doc(booking.id).delete();
      } else {
        cleanWebBookings.push(booking);
      }
    }

    const googleBlocks = busy
      .filter(slot => slot.start.format('YYYY-MM-DD') === date)
      .map((slot, i) => ({
        id: `gcal-${i}`,
        startTime: slot.start.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: slot.end.format('YYYY-MM-DDTHH:mm:ss'),
        isManual: true,
        isAppointment: slot.isAppointment || false,
        type: "block",
        duration_min: slot.end.diff(slot.start, 'minute')
      }));

    return NextResponse.json([...cleanWebBookings, ...googleBlocks], { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500, headers });
  }
}

export async function POST(request: Request) {
  const headers = getCorsHeaders(request);
  if (isRateLimited(request, 'bookings-post')) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429, headers });
  }

  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos de reserva invalidos' }, { status: 400, headers });
    }

    const result = await createBooking({
      ...parsed.data,
      client_email: parsed.data.client_email?.trim() || null,
    });

    return NextResponse.json(result, { status: 201, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500, headers });
  }
}

export async function DELETE(request: Request) {
  const headers = getCorsHeaders(request);
  if (isRateLimited(request, 'bookings-delete')) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429, headers });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400, headers });
  try {
    const db = getFirebaseAdminApp().firestore();
    const docRef = db.collection('bookings').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return NextResponse.json({ error: 'No existe' }, { status: 404, headers });
    const data = docSnap.data() as any;
    
    if (data.client_email) {
        await sendCancellationEmail(data.client_email, data.client_name || data.customerName, data.date, data.start_time || data.startTime, data.lang || 'es');
    }

    if (data?.googleEventId) {
      try { await cancelAppointment(data.googleEventId); } catch (e) {}
    }
    await docRef.delete();
    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500, headers }); }
}