import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";
import { registerCalendarWatch } from "@/lib/calendarWebhookSync";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const frontendUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://agpeluqueria.vercel.app";

  if (!code) return NextResponse.redirect(`${frontendUrl}/?error=NoCode`);

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Cambiamos el código por los Tokens reales
    const { tokens } = await oauth2Client.getToken(code);

    // Si Google nos da un Refresh Token, lo guardamos en la caja fuerte de Firebase
    if (tokens.refresh_token) {
      const db = getFirebaseAdminApp().firestore();
      await db.collection("admin").doc("settings").set(
        { google_refresh_token: tokens.refresh_token },
        { merge: true }
      );
      console.log("✅ Refresh Token de Ana guardado en Firebase");

      // 🚀 AUTO-WEBHOOK: Registramos el webhook automáticamente al vincular
      try {
        await registerCalendarWatch({
          calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
          webhookUrl: `${frontendUrl}/api/webhooks/calendar`,
        });
        console.log("✅ Webhook de Google Calendar registrado automáticamente");
      } catch (webhookErr) {
        console.error("⚠️ No se pudo registrar el webhook automáticamente:", webhookErr);
        // No bloqueamos el flujo principal si el webhook falla, ya que el token sí se guardó
      }
    }


    // Devolvemos a Ana a su panel con un mensaje de éxito
    return NextResponse.redirect(`${frontendUrl}/?google_sync=success`);
  } catch (error) {
    console.error("❌ Error en el callback de Google:", error);
    return NextResponse.redirect(`${frontendUrl}/?error=GoogleSyncFailed`);
  }
}