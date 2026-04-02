import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { createBooking } from '@/lib/bookingService'; 
import { getBusySlots } from '@/lib/googleCalendar';
import dayjs from "dayjs";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 });

  try {
    const db = getFirebaseAdminApp().firestore();
    const fbSnap = await db.collection('bookings')
      .where('startTime', '>=', `${date}T00:00:00`)
      .where('startTime', '<=', `${date}T23:59:59`)
      .get();
    
    const webBookings = fbSnap.docs.map(doc => doc.data());
    
    const start = dayjs.tz(`${date}T00:00:00`, "Europe/Madrid").toDate();
    const end = dayjs.tz(`${date}T23:59:59`, "Europe/Madrid").subtract(1, 'ms').toDate();

    const { busy } = await getBusySlots({ start, end });

    // 🛡️ EL PORTERO: Filtramos para que SOLO pasen los bloques del día exacto
    const googleBlocks = busy
      .filter(slot => slot.start.format('YYYY-MM-DD') === date)
      .map((slot, i) => ({
        id: `gcal-${i}`,
        startTime: slot.start.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: slot.end.format('YYYY-MM-DDTHH:mm:ss'),
        status: 'confirmed',
        isManual: true,
        type: "block",
        duration_min: slot.end.diff(slot.start, 'minute')
      }));

    return NextResponse.json([...webBookings, ...googleBlocks]);
  } catch (error: any) {
    console.error("CRASH EN GET BOOKINGS:", error);
    return NextResponse.json({ error: "Error interno", msg: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await createBooking(body);
    return NextResponse.json(res);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}