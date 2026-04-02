import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { createBooking } from '@/lib/bookingService'; 
import { getBusySlots, cancelAppointment } from '@/lib/googleCalendar';
import { Resend } from 'resend';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Europe/Madrid";
// Inicializamos Resend con tu API Key de Vercel
const resend = new Resend(process.env.RESEND_API_KEY);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// --- ✉️ HELPER: Email de Cancelación ---
async function sendCancellationEmail(email: string, name: string, date: string, time: string) {
  try {
    // IMPORTANTE: 'from' debe ser un dominio verificado en Resend (o el de pruebas onboarding@resend.dev si aún estás testeando)
    await resend.emails.send({
      from: 'AG Beauty Salon <onboarding@resend.dev>', 
      to: email,
      subject: 'Tu cita ha sido cancelada - AG Beauty Salon',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #e11d48;">Cita Cancelada</h2>
          <p>Hola <strong>${name}</strong>,</p>
          <p>Te informamos que tu cita programada para el día <strong>${date}</strong> a las <strong>${time}</strong> ha sido cancelada.</p>
          <p>Si crees que esto es un error o quieres agendar una nueva, puedes hacerlo a través de nuestra web o contactando directamente con nosotros por teléfono o WhatsApp.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">Sentimos las molestias.<br/>AG Beauty Salon</p>
        </div>
      `
    });
    console.log(`✅ Email de cancelación enviado a: ${email}`);
  } catch (error) {
    console.error("❌ Error enviando email de cancelación:", error);
  }
}

export async function OPTIONS() { return new NextResponse(null, { status: 200, headers: corsHeaders }); }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'Falta fecha' }, { status: 400, headers: corsHeaders });

  try {
    const db = getFirebaseAdminApp().firestore();
    
    // 1. Traemos las reservas de Firebase para ese día
    const fbSnap = await db.collection('bookings')
      .where('date', '==', date)
      .get();
    
    const firebaseBookings = fbSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    // 2. Traemos los eventos reales de Google Calendar
    const start = dayjs.tz(`${date}T00:00:00`, TZ).toDate();
    const end = dayjs.tz(`${date}T23:59:59`, TZ).subtract(1, 'ms').toDate();
    const { busy } = await getBusySlots({ start, end });

    // --- 🧹 LÓGICA DE AUTO-LIMPIEZA (Google -> Base de Datos) ---
    const googleEventIds = new Set(busy.map(b => b.sourceEventId).filter(Boolean));
    const cleanWebBookings = [];

    for (const booking of firebaseBookings) {
      // Si la reserva tiene un ID de Google pero YA NO ESTÁ en Google...
      if (booking.googleEventId && !googleEventIds.has(booking.googleEventId)) {
        console.log(`🗑️ Detectada cita borrada en móvil: ${booking.id}. Limpiando y notificando...`);
        
        // Enviamos email al cliente ANTES de borrar la base de datos
        if (booking.client_email) {
          await sendCancellationEmail(booking.client_email, booking.client_name, booking.date, booking.start_time);
        }

        // Borramos de Firebase
        await db.collection('bookings').doc(booking.id).delete();
      } else {
        cleanWebBookings.push(booking);
      }
    }
    // ------------------------------------------------------------

    // 3. Formateamos los bloqueos manuales de Google
    const googleBlocks = busy
      .filter(slot => slot.start.format('YYYY-MM-DD') === date)
      .map((slot, i) => ({
        id: slot.sourceEventId || `gcal-${i}`,
        startTime: slot.start.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: slot.end.format('YYYY-MM-DDTHH:mm:ss'),
        status: 'confirmed',
        isManual: true,
        type: "block",
        duration_min: slot.end.diff(slot.start, 'minute')
      }));

    return NextResponse.json([...cleanWebBookings, ...googleBlocks], { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error("CRASH EN GET BOOKINGS:", error);
    return NextResponse.json({ error: "Error interno", msg: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createBooking(body);
    return NextResponse.json(result, { status: 201, headers: corsHeaders });
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders }); 
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400, headers: corsHeaders });
  
  try {
    const db = getFirebaseAdminApp().firestore();
    const docRef = db.collection('bookings').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) return NextResponse.json({ error: 'No existe' }, { status: 404, headers: corsHeaders });
    const data = docSnap.data() as any;
    
    // 1. Notificar al cliente (Borrado manual desde la web)
    if (data.client_email) {
      await sendCancellationEmail(data.client_email, data.client_name, data.date, data.start_time);
    }

    // 2. Borrar también en Google Calendar
    if (data?.googleEventId) {
      try { await cancelAppointment(data.googleEventId); } catch (e) {
        console.warn("No se pudo borrar en Google, quizás ya no existía.");
      }
    }
    
    // 3. Borrar de Firebase
    await docRef.delete();
    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error) { 
    return NextResponse.json({ error: 'Error' }, { status: 500, headers: corsHeaders }); 
  }
}