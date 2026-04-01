import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";
import { sendCancellationEmail } from "@/lib/notifications";
import { cancelAppointment } from "@/lib/googleCalendar"; // 👈 Añadido para Google Calendar

// 🛡️ Permisos CORS ampliados y robustos
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// 🛠️ CORRECCIÓN CORS: Obligamos a que el "preflight" devuelva un status 200 exacto
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// Aquí es donde ocurre la magia al darle al botón "Cancelar"
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    // 1. Buscamos la cita en la base de datos de Firebase
    const db = getFirebaseAdminApp().firestore();
    const bookingRef = db.collection("bookings").doc(id);
    const bookingSnap = await bookingRef.get();

    // Si la cita ya no existe
    if (!bookingSnap.exists) {
      console.log("⚠️ Intento de cancelar una reserva que no existe:", id);
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404, headers: corsHeaders });
    }

    const data = bookingSnap.data() as any;

    // 2. 🚀 BORRAR DE GOOGLE CALENDAR (Sincronización bidireccional)
    // Solo funcionará si la reserva tiene guardado el 'googleEventId'
    if (data.googleEventId) {
      try {
        await cancelAppointment(data.googleEventId);
        console.log("✅ Evento borrado de Google Calendar:", data.googleEventId);
      } catch (calError) {
        console.error("⚠️ Aviso: No se pudo borrar de Google (quizás ya se borró a mano):", calError);
      }
    }

    // 3. Borramos la cita de Firebase para que el hueco vuelva a quedar libre en la web
    await bookingRef.delete();
    console.log("✅ Cita borrada de Firebase:", id);

    // 4. Enviamos el email de cancelación para avisar a la clienta
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
        console.error("⚠️ Aviso: La cita se borró, pero falló el email de cancelación:", emailError);
      }
    }

    // Respondemos OK con los cabezales CORS correctos
    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("❌ Error grave al cancelar la cita:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders });
  }
}