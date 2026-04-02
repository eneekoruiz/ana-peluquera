import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { createBooking, getAvailableSlots } from '@/lib/bookingService';
import { cancelAppointment } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const CONTACT_INFO = {
  whatsapp: "https://wa.me/34600000000",
  phone: "943 00 00 00",
  message: "Si tienes problemas con tu reserva, contacta con Ana por WhatsApp."
};

export async function OPTIONS() { return new NextResponse(null, { status: 200, headers: corsHeaders }); }

// 🇪🇸 Esta función convierte el evento de Google en la hora EXACTA de España
function formatToMadridTime(dateInput: Date | string): string {
  const date = new Date(dateInput);
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  return formatter.format(date).replace(' ', 'T');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) return NextResponse.json({ error: 'La fecha es obligatoria' }, { status: 400, headers: corsHeaders });

  try {
    const db = getFirebaseAdminApp().firestore();
    const snapshot = await db.collection('bookings')
      .where('startTime', '>=', `${date}T00:00:00`)
      .where('startTime', '<=', `${date}T23:59:59`)
      .get();
    const firebaseBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let manualEvents: any[] = [];
    try {
      const result = await getAvailableSlots(date);
      const busySlots = Array.isArray(result) ? result : ((result as any)?.busy || []);

      manualEvents = busySlots.map((slot: any, index: number) => {
        // Al aplicar la hora de Madrid forzamos a que el frontend lea "12:15" literalmente.
        const startMadrid = formatToMadridTime(slot.start);
        const endMadrid = formatToMadridTime(slot.end);

        return {
          id: `gcal-manual-${index}`,
          startTime: startMadrid,
          endTime: endMadrid,
          status: 'confirmed',
          title: 'Bloqueo Manual (Google)',
          isManual: true
        };
      });
    } catch (error) {
      console.error("⚠️ Error leyendo Google Calendar:", error);
    }

    return NextResponse.json([...firebaseBookings, ...manualEvents], { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cargar la agenda', fallback: CONTACT_INFO }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createBooking(body);
    return NextResponse.json(result, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, fallback: CONTACT_INFO }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el ID' }, { status: 400, headers: corsHeaders });
  try {
    const db = getFirebaseAdminApp().firestore();
    const docRef = db.collection('bookings').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return NextResponse.json({ error: 'No existe la reserva' }, { status: 404, headers: corsHeaders });
    const data = docSnap.data();
    if (data?.googleEventId) {
      try { await cancelAppointment(data.googleEventId); } catch (e) { /* Ya borrado */ }
    }
    await docRef.delete();
    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cancelar', fallback: CONTACT_INFO }, { status: 500, headers: corsHeaders });
  }
}