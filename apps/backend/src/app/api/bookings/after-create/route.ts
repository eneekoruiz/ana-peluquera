import { NextResponse } from "next/server";
import { sendConfirmationEmail } from "@/lib/notifications";
import { createAppointment } from "@/lib/googleCalendar";
import { getFirebaseAdminApp, getDb } from "@/lib/firebaseAdmin"; // 👈 Importamos Firebase para poder guardar el ID

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      client_email, client_name, client_phone, service_name, 
      date, start_time, end_time, id, 
      phase1_min, phase2_min, phase3_min 
    } = body;

    const startDateTime = new Date(`${date}T${start_time}:00`);
    const endDateTime = new Date(`${date}T${end_time}:00`);

    // 1. Apuntamos la cita en el Google Calendar usando tu función avanzada
    try {
      // 🚀 CAMBIO CLAVE: Guardamos el resultado de crear la cita en una variable
      const calendarResult = await createAppointment({
        start: startDateTime,
        end: endDateTime,
        serviceId: service_name || "Servicio",
        bookingId: id,
        customerName: client_name,
        notes: `📞 Teléfono: ${client_phone}\n📧 Email: ${client_email}\nID Reserva: ${id}`,
        phase1Min: phase1_min || 0,
        phase2Min: phase2_min || 0,
        phase3Min: phase3_min || 0,
      });
      console.log("✅ Evento creado en Google Calendar. ID:", calendarResult.eventId);

      // 🚀 EL ESLABÓN PERDIDO: Guardamos ese ID en Firebase para poder borrarlo después
      if (calendarResult.eventId) {
        const db = getDb();
        await db.collection("bookings").doc(id).update({
          googleEventId: calendarResult.eventId
        });
        console.log("✅ ID de Google guardado correctamente en Firebase");
      }

    } catch (calError) {
      console.error("⚠️ Aviso: Falló la sincronización con Google Calendar:", calError);
    }

    // 2. Mandamos el email (si tiene)
    if (client_email) {
      try {
        await sendConfirmationEmail({
          to: client_email,
          customerName: client_name,
          serviceName: service_name || "Servicio en AG Beauty",
          startTime: startDateTime.toISOString(),
          cancelToken: id
        });
        console.log("✅ Email enviado a", client_email);
      } catch (emailError) {
        console.error("⚠️ Aviso: Falló el envío del email de confirmación:", emailError);
      }
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ Error grave en after-create:", error);
    return NextResponse.json({ error: "Error procesando reserva" }, { status: 500, headers: corsHeaders });
  }
}