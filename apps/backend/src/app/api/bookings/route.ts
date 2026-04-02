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

const resend = new Resend(process.env.RESEND_API_KEY);
const TZ = "Europe/Madrid";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// --- HELPER: El mismo email elegante que usamos en bookingService ---
async function sendCancellationEmail(email: string, name: string, date: string, time: string, lang: string) {
  const t = {
    es: { subject: "Cita Cancelada", title: "Cita Cancelada", msg: `Hola ${name}, tu cita del ${date} a las ${time} ha sido cancelada.` },
    en: { subject: "Appointment Cancelled", title: "Appointment Cancelled", msg: `Hello ${name}, your appointment on ${date} at ${time} has been cancelled.` },
    eu: { subject: "Hitzordua Ezeztatuta", title: "Hitzordua Ezeztatuta", msg: `Kaixo ${name}, zure ${date}ko ${time}ko hitzordua ezeztatu da.` }
  };
  const text = t[lang as keyof typeof t] || t.es;

  try {
    await resend.emails.send({
      from: 'AG Beauty Salon <onboarding@resend.dev>',
      to: email,
      subject: `${text.subject} - AG Beauty Salon`,
      html: `<div style="font-family:sans-serif; padding:20px; border:1px solid #eee; border-radius:10px;">
        <h2 style="color:#e11d48;">${text.title}</h2>
        <p>${text.msg}</p>
        <p style="font-size:12px; color:#999;">AG Beauty Salon - Donostia</p>
      </div>`
    });
  } catch (e) { console.error("Error email auto-limpieza:", e); }
}

export async function OPTIONS() { return new NextResponse(null, { status: 200, headers: corsHeaders }); }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'Falta fecha' }, { status: 400, headers: corsHeaders });

  try {
    const db = getFirebaseAdminApp().firestore();
    const fbSnap = await db.collection('bookings').where('date', '==', date).get();
    const firebaseBookings = fbSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    const start = dayjs.tz(`${date}T00:00:00`, TZ).toDate();
    const end = dayjs.tz(`${date}T23:59:59`, TZ).subtract(1, 'ms').toDate();
    const { busy } = await getBusySlots({ start, end });

    // IDs que Google dice que están OCUPADOS actualmente
    const googleEventIds = new Set(busy.map(b => b.sourceEventId).filter(Boolean));
    const cleanWebBookings = [];

    for (const booking of firebaseBookings) {
      // 🕵️ REGRESA EL CONSERJE CON SEGURIDAD (Regla de los 10 minutos)
      const minutesSinceCreation = dayjs().diff(dayjs(booking.createdAt || booking.created_at), 'minute');
      
      const existsInGoogle = booking.googleEventId && googleEventIds.has(booking.googleEventId);

      if (booking.googleEventId && !existsInGoogle && minutesSinceCreation > 10) {
        // SI NO ESTÁ EN GOOGLE Y LLEVA MÁS DE 10 MINUTOS EN FIREBASE -> Ana la ha borrado.
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
        id: slot.sourceEventId || `gcal-${i}`,
        startTime: slot.start.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: slot.end.format('YYYY-MM-DDTHH:mm:ss'),
        isManual: true,
        type: "block",
        duration_min: slot.end.diff(slot.start, 'minute')
      }));

    return NextResponse.json([...cleanWebBookings, ...googleBlocks], { status: 200, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500, headers: corsHeaders });
  }
}

// ... POST y DELETE se mantienen igual que en tu versión anterior
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
    
    if (data.client_email) {
        await sendCancellationEmail(data.client_email, data.client_name || data.customerName, data.date, data.start_time || data.startTime, data.lang || 'es');
    }

    if (data?.googleEventId) {
      try { await cancelAppointment(data.googleEventId); } catch (e) {}
    }
    await docRef.delete();
    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500, headers: corsHeaders }); }
}