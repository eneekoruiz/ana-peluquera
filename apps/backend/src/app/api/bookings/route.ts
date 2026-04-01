import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { createBooking, getAvailableSlots } from '@/lib/bookingService';
// 👇 Importamos la función para borrar en Google Calendar (Ajusta la ruta si es necesario)
import { cancelAppointment } from '@/lib/googleCalendar';

// 🚀 EL ANTI-CACHÉ: Esto obliga a Vercel a ejecutar el código SIEMPRE y consultar a Google en tiempo real.
// Sin esto, Vercel guarda la respuesta antigua y parece que no se sincroniza.
export const dynamic = 'force-dynamic';

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
        title: 'Bloqueo Manual', // Añadido para que en el panel admin se vea claro
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
 * DELETE: Elimina una reserva de Firebase y de Google Calendar
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Falta el ID' }, { status: 400, headers: corsHeaders });
  }

  try {
    const db = getFirebaseAdminApp().firestore();
    const docRef = db.collection('bookings').doc(id);
    const docSnap = await docRef.get();
    
    // 1. Verificamos si la reserva existe y si tiene un ID de Google Calendar
    if (docSnap.exists) {
      const bookingData = docSnap.data();
      
      // 2. Si tiene googleEventId, disparamos la eliminación en el calendario de Ana
      if (bookingData?.googleEventId) {
        try {
          await cancelAppointment(bookingData.googleEventId);
        } catch (calendarError) {
          console.warn(`⚠️ No se pudo borrar de Google Calendar el evento ${bookingData.googleEventId}. Puede que ya estuviera borrado a mano.`, calendarError);
        }
      }

      // 3. Lo borramos definitivamente de Firebase
      await docRef.delete();
    } else {
      return NextResponse.json({ error: 'La reserva no existe en la base de datos' }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, message: 'Reserva eliminada de Firebase y Google Calendar' }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('❌ Error en DELETE /api/bookings:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor al cancelar la reserva' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}