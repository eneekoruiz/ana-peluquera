import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
// Solo traemos la creación de citas de bookingService, la lectura la hacemos directa
import { createBooking } from '@/lib/bookingService'; 
// 🚀 CRÍTICO: Importamos getBusySlots directo de la fuente para evitar dobles conversiones
import { cancelAppointment, getBusySlots } from '@/lib/googleCalendar';

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

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
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
      // 🚀 MAGIA PURA: Leemos los bloqueos saltándonos cualquier intermediario.
      // Forzamos la consulta como UTC para que Vercel no altere las horas.
      const startDate = new Date(`${date}T00:00:00Z`);
      const endDate = new Date(`${date}T23:59:59Z`);
      
      const { busy } = await getBusySlots({ start: startDate, end: endDate });

      manualEvents = busy.map((slot: any, index: number) => {
        return {
          id: `gcal-manual-${index}`,
          // El truco "Fake UTC": Al hacer toISOString y cortar la cola, 
          // extraemos la hora EXACTA del calendario ignorando si el servidor está en Londres o en China.
          startTime: slot.start.toISOString().substring(0, 19),
          endTime: slot.end.toISOString().substring(0, 19),
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
      try { await cancelAppointment(data.googleEventId); } catch (e) { /* Ya borrado en Google */ }
    }

    await docRef.delete();
    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cancelar', fallback: CONTACT_INFO }, { status: 500, headers: corsHeaders });
  }
}