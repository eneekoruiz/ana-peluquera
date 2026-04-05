import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";
import { sendCancellationEmail } from "@/lib/notifications";
import { cancelAppointment } from "@/lib/googleCalendar"; 

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Aunque la variable se llame 'id' por la ruta de Next.js, en realidad nos está llegando el cancelToken
    const token = params.id;
    
    const db = getFirebaseAdminApp().firestore();
    
    // 1. 🚀 FIX: Buscamos la cita por su cancelToken, NO por su ID de documento
    const snapshot = await db.collection("bookings")
      .where("cancelToken", "==", token)
      .where("status", "in", ["confirmed", "pending"]) // Solo cancelamos si estaba activa
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("⚠️ Intento de cancelar una reserva con token inválido o ya cancelada:", token);
      return NextResponse.json({ error: "Reserva no encontrada o ya cancelada" }, { status: 404, headers: corsHeaders });
    }

    const bookingDoc = snapshot.docs[0];
    const data = bookingDoc.data() as any;

    // 2. BORRAR DE GOOGLE CALENDAR
    if (data.googleEventId) {
      try {
        await cancelAppointment(data.googleEventId);
        console.log("✅ Evento borrado de Google Calendar:", data.googleEventId);
      } catch (calError) {
        console.error("⚠️ Aviso: No se pudo borrar de Google (quizás ya se borró a mano):", calError);
      }
    }

    // 3. 🚀 FIX: Actualizamos el estado a 'cancelled' en vez de borrar el documento
    // Así el hueco queda libre en la web, pero Ana guarda el historial
    await bookingDoc.ref.update({
      status: 'cancelled',
      canceledAt: new Date().toISOString()
    });
    console.log("✅ Cita cancelada en Firebase:", bookingDoc.id);

    // 4. Enviamos el email de cancelación
    if (data.client_email) {
      try {
        await sendCancellationEmail({
          to: data.client_email,
          customerName: data.client_name,
          serviceName: data.service_name || "Servicio en AG Beauty",
          startTime: `${data.date}T${data.start_time}:00`
        });
        console.log("✅ Email de cancelación enviado a:", data.client_email);
      } catch (emailError) {
        console.error("⚠️ Aviso: La cita se canceló, pero falló el email de aviso:", emailError);
      }
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("❌ Error grave al cancelar la cita:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders });
  }
}