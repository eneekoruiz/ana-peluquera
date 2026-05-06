import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";
import { sendCancellationEmail } from "@/lib/notifications";
import { cancelAppointment } from "@/lib/googleCalendar"; 
import crypto from 'node:crypto';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://eneko-ruiz.vercel.app')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const headers = getCorsHeaders(request);
  try {
    const rawToken = params.id;
    const hashedInput = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    const db = getFirebaseAdminApp().firestore();
    
    // Buscamos por el hash o por el raw (legacy)
    const snapshot = await db.collection("bookings")
      .where("status", "in", ["confirmed", "pending", "error"])
      .get();

    const bookingDoc = snapshot.docs.find(doc => {
      const d = doc.data();
      return d.cancelToken === hashedInput || d.cancelToken === rawToken;
    });

    if (!bookingDoc) {
      return NextResponse.json({ error: "Token inválido o reserva ya cancelada" }, { status: 404, headers });
    }

    const data = bookingDoc.data();

    // 1. Google Calendar
    if (data.googleEventId) {
      try {
        await cancelAppointment(data.googleEventId);
      } catch (calError) {
        console.error("Google Calendar delete error:", calError);
      }
    }

    // 2. Firebase status update
    await bookingDoc.ref.update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    });

    // 3. Notificación
    if (data.client_email) {
      try {
        await sendCancellationEmail({
          to: data.client_email,
          customerName: data.client_name,
          serviceName: data.service_name || "Servicio en AG Beauty",
          startTime: `${data.date}T${data.start_time}:00`
        });
      } catch (emailError) {
        console.error("Email notification error:", emailError);
      }
    }

    return NextResponse.json({ success: true }, { status: 200, headers });

  } catch (error) {
    console.error("❌ Error grave en cancelación:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}