import { NextResponse } from 'next/server';
import { getFirebaseAdminApp, getDb, requireAdminFromIdToken } from '@/lib/firebaseAdmin';
import { createBooking, cancelBookingByToken } from '@/lib/bookingService'; 
import { getBusySlots, cancelAppointment } from '@/lib/googleCalendar'; 
import { sendCancellationEmail } from '@/lib/notifications';
import { z } from 'zod';
import { isRateLimited, getRateLimitResponse } from '@/lib/rateLimiter';
import { getCorsHeaders } from '@/lib/cors';
import crypto from 'node:crypto';

const bookingSchema = z.object({
  client_name: z.string().min(2),
  client_email: z.string().email().optional().nullable(),
  client_phone: z.string().min(9),
  service_id: z.string(),
  service_name: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string(),
  end_time: z.string(),
  notes: z.string().optional(),
  lang: z.string().optional(),
});

// Use shared `getCorsHeaders` from `src/lib/cors`.

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
}

export async function GET(request: Request) {
  const headers = getCorsHeaders(request);
  if (await isRateLimited(request, 'bookings-access', 120)) {
    return getRateLimitResponse();
  }

  const { searchParams } = new URL(request.url);
  let start = searchParams.get('start');
  let end = searchParams.get('end');
  const date = searchParams.get('date');

  if (date) {
    start = `${date}T00:00:00`;
    end = `${date}T23:59:59`;
  }

  if (!start || !end) {
    return NextResponse.json({ error: 'Missing range' }, { status: 400, headers });
  }

  try {
    const { busy } = await getBusySlots({ start, end });
    
    // 🔥 PRIVACIDAD: Nunca devolvemos datos personales en el GET público
    // Solo devolvemos los bloques ocupados para el calendario.
    const publicSlots = busy.map(slot => ({
      start: slot.start.format(),
      end: slot.end.format(),
    }));

    return NextResponse.json(publicSlots, { headers });
  } catch (error: any) {
    console.error("❌ Error en GET /api/bookings:", error);
    if (error.message === "CALENDAR_DISCONNECTED") {
      return NextResponse.json({ error: "MAINTENANCE_MODE" }, { status: 503, headers });
    }
    return NextResponse.json({ error: 'Error al cargar disponibilidad' }, { status: 500, headers });
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
    console.error("❌ Error en POST /api/bookings:", error);
    
    const errorMsg = error.message || 'Error interno';
    let status = 500;
    
    if (errorMsg === "MAINTENANCE_MODE") {
      status = 503;
    } else if (errorMsg === "SLOT_OCCUPIED") {
      status = 409;
    } else if (errorMsg === "SERVICE_NOT_FOUND") {
      status = 404;
    }
    
    return NextResponse.json({ error: errorMsg }, { status, headers });
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