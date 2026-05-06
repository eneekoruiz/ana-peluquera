import { NextResponse } from 'next/server';
import { getFirebaseAdminApp, requireAdminFromIdToken } from '@/lib/firebaseAdmin';
import { createBooking } from '@/lib/bookingService'; 
import { getBusySlots, cancelAppointment } from '@/lib/googleCalendar'; 
import { sendCancellationEmail } from '@/lib/notifications';
import { z } from 'zod';
import { isRateLimited, getRateLimitResponse } from '@/lib/rateLimiter';
import crypto from 'node:crypto';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://eneko-ruiz.vercel.app')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const bookingSchema = z.object({
  client_name: z.string().min(2),
  client_email: z.string().email().optional().nullable(),
  client_phone: z.string().min(9),
  service_id: z.string(),
  service_name: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string(),
  end_time: z.string(),
  notes: z.string().optional(),
  lang: z.string().optional(),
});

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : (ALLOWED_ORIGINS[0] || '');

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
}

export async function GET(request: Request) {
  const headers = getCorsHeaders(request);
  if (await isRateLimited(request, 'bookings-access', 60)) {
    return getRateLimitResponse();
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json({ error: 'Missing range' }, { status: 400, headers });
  }

  try {
    const { busy } = await getBusySlots({ start, end });
    
    // 🔥 PRIVACIDAD: Nunca devolvemos datos personales en el GET público
    // Solo devolvemos los bloques ocupados para el calendario.
    const publicSlots = busy.map(slot => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
    }));

    return NextResponse.json(publicSlots, { headers });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500, headers });
  }
}

export async function POST(request: Request) {
  const headers = getCorsHeaders(request);
  if (await isRateLimited(request, 'bookings-post', 10)) {
    return getRateLimitResponse();
  }

  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos de reserva invalidos' }, { status: 400, headers });
    }

    const result = await createBooking({
      ...parsed.data,
      client_email: parsed.data.client_email?.trim() || '',
    });

    return NextResponse.json(result, { status: 201, headers });
  } catch (error: any) {
    if (error.message === "MAINTENANCE_MODE") {
      return NextResponse.json({ error: "MAINTENANCE_MODE" }, { status: 503, headers });
    }
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500, headers });
  }
}

export async function DELETE(request: Request) {
  const headers = getCorsHeaders(request);
  if (await isRateLimited(request, 'bookings-delete', 20)) {
    return getRateLimitResponse();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const rawCancelToken = searchParams.get('token');
  const authHeader = request.headers.get("authorization");

  if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400, headers });

  try {
    const db = getFirebaseAdminApp().firestore();
    const docRef = db.collection('bookings').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) return NextResponse.json({ error: 'No existe' }, { status: 404, headers });
    
    const data = docSnap.data() as any;
    let isAuthorized = false;

    // 1. Verificar Admin
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1];
        await requireAdminFromIdToken(token);
        isAuthorized = true;
      } catch (err) {}
    }

    // 2. Verificar Token de Cliente (SHA-256)
    if (!isAuthorized && rawCancelToken) {
      const hashedInput = crypto.createHash('sha256').update(rawCancelToken).digest('hex');
      if (data.cancelToken === hashedInput || data.cancelToken === rawCancelToken) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403, headers });
    }

    // Proceso de cancelación
    if (data.client_email) {
        try {
          await sendCancellationEmail({
            to: data.client_email,
            customerName: data.client_name || "Cliente",
            serviceName: data.service_name || "Servicio",
            startTime: `${data.date}T${data.start_time}:00`
          });
        } catch (e) { console.error("Email error:", e); }
    }

    if (data?.googleEventId) {
      try { await cancelAppointment(data.googleEventId); } catch (e) {}
    }
    
    await docRef.delete();
    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch (error) { 
    console.error("Error en DELETE /api/bookings:", error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500, headers }); 
  }
}