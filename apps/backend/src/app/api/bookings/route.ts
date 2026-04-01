import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { createBooking, getAvailableSlots } from '@/lib/bookingService';
import { cancelAppointment } from '@/lib/googleCalendar';

// 🚀 Obligamos a Vercel a consultar Google Calendar en CADA visita
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const CONTACT_INFO = {
  whatsapp: "https://wa.me/34600000000", // Cambia esto
  phone: "943 00 00 00",
  message: "Si tienes problemas con tu reserva, contacta con Ana por WhatsApp."
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'La fecha es obligatoria' }, { status: 400, headers: corsHeaders });
  }

  try {
    const db = getFirebaseAdminApp().firestore();
    
    // 1. Reservas de la Web (Firebase)
    const snapshot = await db.collection('bookings')
      .where('startTime', '>=', `${date}T00:00:00`)
      .where('startTime', '<=', `${date}T23:59:59`)
      .get();

    const firebaseBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. 🚀 Sincronización con Google Calendar
    let manualEvents: any[] = [];
    try {
      const result = await getAvailableSlots(date);
      
      // IMPORTANTE: getAvailableSlots devuelve { busy: [] }. 
      // Usamos el array 'busy' para el mapeo.
      const busySlots = result.busy || []; 

      manualEvents = busySlots.map((slot: any, index: number) => {
        // Limpiamos la fecha para que el frontend no se líe con UTC/Zonas
        const startStr = new Date(slot.start).toISOString().substring(0, 19);
        const endStr = new Date(slot.end).toISOString().substring(0, 19);

        return {
          id: `gcal-${index}`,
          startTime: startStr,
          endTime: endStr,
          status: 'confirmed',
          title: 'Bloqueo Manual (Google)',
          isManual: true
        };
      });
    } catch (error) {
      console.error("⚠️ Error leyendo Google Calendar:", error);
    }

    return NextResponse.json([...firebaseBookings, ...manualEvents], { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("❌ Error en GET Bookings:", error);
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
      try {
        await cancelAppointment(data.googleEventId);
      } catch (e) {
        console.warn("Evento ya borrado en Google");
      }
    }

    await docRef.delete();
    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cancelar', fallback: CONTACT_INFO }, { status: 500, headers: corsHeaders });
  }
}