import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { createBooking } from '@/lib/bookingService'; 
import { cancelAppointment, getBusySlots } from '@/lib/googleCalendar';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() { return new NextResponse(null, { status: 200, headers: corsHeaders }); }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date'); // Formato esperado: YYYY-MM-DD

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
      const startDate = dayjs.tz(`${date}T00:00:00`, "Europe/Madrid").toDate();
      const endDate = dayjs.tz(`${date}T23:59:59`, "Europe/Madrid").toDate();
      
      const { busy } = await getBusySlots({ start: startDate, end: endDate });

      manualEvents = busy.map((slot: any, index: number) => {
        return {
          id: `gcal-manual-${index}`,
          // Exportamos la hora local de Madrid sin la "Z" para que el frontend lo lea literal
          startTime: slot.start.format('YYYY-MM-DDTHH:mm:ss'), 
          endTime: slot.end.format('YYYY-MM-DDTHH:mm:ss'),
          status: 'confirmed',
          title: 'Bloqueo Calendario',
          isManual: true
        };
      });

    } catch (error) { console.error("⚠️ Error Google Calendar:", error); }

    return NextResponse.json([...firebaseBookings, ...manualEvents], { status: 200, headers: corsHeaders });
  } catch (error) { return NextResponse.json({ error: 'Error interno' }, { status: 500, headers: corsHeaders }); }
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
    const data = docSnap.data();
    if (data?.googleEventId) {
      try { await cancelAppointment(data.googleEventId); } catch (e) {}
    }
    await docRef.delete();
    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500, headers: corsHeaders }); }
}