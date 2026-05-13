import { NextResponse } from 'next/server';
import { getFirebaseAdminApp, getDb, requireAdminFromIdToken } from '@/lib/firebaseAdmin';
import { createBooking, cancelBookingByToken } from '@/lib/bookingService'; 
import { getBusySlots, cancelAppointment } from '@/lib/googleCalendar'; 
import { sendCancellationEmail } from '@/lib/notifications';
import { z } from 'zod';
import { isRateLimited, getRateLimitResponse } from '@/lib/rateLimiter';
import crypto from 'node:crypto';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://eneko-ruiz.vercel.app,https://ana-peluqueria.vercel.app,https://ana-peluquera.vercel.app')
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
  if (await isRateLimited(request, 'bookings-access', 120)) {
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
  if (await isRateLimited(request, 'bookings-post', 25)) {
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

  if (!id && !rawCancelToken) {
    return NextResponse.json({ error: 'Falta ID o Token' }, { status: 400, headers });
  }

  try {
    let isAdmin = false;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1];
        await requireAdminFromIdToken(token);
        isAdmin = true;
      } catch (err) {}
    }

    // Usamos el ID si es admin, o el token si es cliente
    const identifier = (isAdmin && id) ? id : (rawCancelToken || id || "");
    
    await cancelBookingByToken(identifier, isAdmin);
    
    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch (error: any) { 
    console.error("Error en DELETE /api/bookings:", error);
    const status = error.message === "INVALID_TOKEN" ? 403 : error.message === "BOOKING_NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: error.message || 'Error interno' }, { status, headers }); 
  }
}