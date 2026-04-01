import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { createBooking, getAvailableSlots } from '@/lib/bookingService';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * GET: Obtiene TODAS las citas (Firebase + Google Calendar Manual)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'La fecha es obligatoria' }, { status: 400, headers: corsHeaders });
  }

  try {
    const db = getFirebaseAdminApp().firestore();
    
    // 1. Buscamos en Firebase todas las reservas hechas por la web
    const snapshot = await db.collection('bookings')
      .where('startTime', '>=', `${date}T00:00:00`)
      .where('startTime', '<=', `${date}T23:59:59`)
      .orderBy('startTime', 'asc')
      .get();

    const firebaseBookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 2. 🚀 MAGIA: Pedimos los huecos ocupados reales a Google Calendar (Eventos manuales de Ana)
    let manualEvents: any[] = [];
    try {
      const calendarBusySlots = await getAvailableSlots(date);
      // Transformamos los huecos de Google al formato que entiende el Frontend
      manualEvents = calendarBusySlots.map((slot: any, index: number) => ({
        id: `gcal-manual-${index}`,
        startTime: slot.start,
        endTime: slot.end,
        status: 'confirmed',
      }));
    } catch (error) {
      console.warn("⚠️ No se pudo sincronizar Google Calendar para eventos manuales", error);
    }

    // 3. Unimos ambas listas. ¡El frontend bloqueará todas las horas que choquen!
    const allBookings = [...firebaseBookings, ...manualEvents];

    return NextResponse.json(allBookings, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ Error en API Admin Bookings:", error);
    return NextResponse.json(
      { error: 'Error al obtener la agenda de Ana' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST: Crea una nueva reserva.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createBooking(body);
    return NextResponse.json(result, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error('❌ Error en POST /api/bookings:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
/**
 * DELETE: Elimina una reserva de Firebase (y Google Calendar si corresponde)
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Falta el ID' }, { status: 400, headers: corsHeaders });
  }

  try {
    const db = getFirebaseAdminApp().firestore();
    
    // Lo borramos de Firebase
    await db.collection('bookings').doc(id).delete();

    // NOTA: Si tuvieras que borrarlo de Google Calendar también, 
    // aquí llamaríamos a la función de tu bookingService.ts
    // await deleteGoogleCalendarEvent(id);

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('❌ Error en DELETE /api/bookings:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}