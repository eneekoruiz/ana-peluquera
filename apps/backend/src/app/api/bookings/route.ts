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
    
    // 🚨 Si esto falla, el catch de abajo lo atrapará y nos dirá el motivo exacto
    const { busy } = await getBusySlots({ 
      start: dayjs(date).startOf('day').toDate(), 
      end: dayjs(date).endOf('day').toDate() 
    });

    const googleBlocks = busy.map((slot, i) => ({
      id: `gcal-${i}`,
      startTime: slot.start.format('YYYY-MM-DDTHH:mm:ss'),
      endTime: slot.end.format('YYYY-MM-DDTHH:mm:ss'),
      status: 'confirmed',
      isManual: true,
      type: "block" // Añadimos esto para que tu scheduler.ts lo reconozca al 100%
    }));

    return NextResponse.json([...webBookings, ...googleBlocks]);
  } catch (error: any) {
    // 🔥 EL CHIVATO: Ahora imprimirá el error real en tu pantalla negra
    console.error("CRASH EN GET BOOKINGS:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor", 
      mensaje_real: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await createBooking(body);
    return NextResponse.json(res);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}