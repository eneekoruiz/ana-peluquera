import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { registerCalendarWatch, readCalendarWatchConfig } from "@/lib/calendarWebhookSync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 1. Escudo de seguridad: Solo Vercel puede ejecutar esta URL
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Acceso denegado', { status: 401 });
  }

  try {
    // 2. Leer la configuración actual de la base de datos
    const settingsSnap = await db.collection("admin").doc("settings").get();
    const settings = settingsSnap.data() || {};
    const watchConfig = readCalendarWatchConfig(settings);

    if (!watchConfig || !watchConfig.expiration) {
      return NextResponse.json({ status: "ignorado", message: "No hay webhook activo que renovar." });
    }

    // 3. Calcular cuánto le queda de vida
    const expirationDate = new Date(Number(watchConfig.expiration)); // Google lo manda en milisegundos
    const now = new Date();
    const daysUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // 4. Si le quedan 2 días o menos, disparamos la renovación
    if (daysUntilExpiration <= 2) {
      console.log(`⏳ Webhook caduca en ${daysUntilExpiration.toFixed(1)} días. Renovando...`);
      
      // 🔥 EJECUTAMOS LA RENOVACIÓN
      await registerCalendarWatch({
        calendarId: watchConfig.calendarId,
        webhookUrl: watchConfig.webhookUrl
      }); 

      return NextResponse.json({ status: "éxito", message: "Webhook renovado automáticamente." });
    }

    // Si aún le queda mucha vida, no hacemos nada
    return NextResponse.json({ 
      status: "ignorado", 
      message: `El webhook está sano. Le quedan ${daysUntilExpiration.toFixed(1)} días.` 
    });

  } catch (error) {
    console.error("❌ Error en el Cron Job de renovación:", error);
    return NextResponse.json({ status: "error", error: "Fallo interno" }, { status: 500 });
  }
}