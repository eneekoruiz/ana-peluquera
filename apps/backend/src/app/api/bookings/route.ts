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
      .where('status', '==', 'confirmed')
      .get();
    
    const webBookings = fbSnap.docs.map(doc => doc.data());
    const { busy } = await getBusySlots({ 
      start: dayjs(date).startOf('day').toDate(), 
      end: dayjs(date).endOf('day').toDate() 
    });

    const googleBlocks = busy.map((slot, i) => ({
      id: `gcal-${i}`,
      startTime: slot.start.format('YYYY-MM-DDTHH:mm:ss'),
      endTime: slot.end.format('YYYY-MM-DDTHH:mm:ss'),
      status: 'confirmed',
      isManual: true
    }));

    return NextResponse.json([...webBookings, ...googleBlocks]);
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await createBooking(body);
    return NextResponse.json(res);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}