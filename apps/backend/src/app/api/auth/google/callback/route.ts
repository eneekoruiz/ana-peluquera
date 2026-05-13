import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getFirebaseAdminApp, getDb } from "@/lib/firebaseAdmin";
import { registerCalendarWatch } from "@/lib/calendarWebhookSync";
import { cookies } from "next/headers";

/**
 * GET /api/auth/google/callback
 * Recibe el código de Google y lo intercambia por un Refresh Token.
 * 🔒 SEGURIDAD: Verifica el parámetro 'state' para prevenir CSRF.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = cookies().get("google_oauth_state")?.value;
  
  const frontendUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://eneko-ruiz.vercel.app";

  // 🛡️ VALIDACIÓN DE SEGURIDAD (CSRF)
  if (!state || state !== savedState) {
    console.error("❌ CSRF detectado o state expirado en el callback de Google.");
    return NextResponse.redirect(`${frontendUrl}/?error=InvalidState`);
  }

  if (!code) return NextResponse.redirect(`${frontendUrl}/?error=NoCode`);

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.refresh_token) {
      const db = getDb();
      
      await db.collection("settings").doc("admin").set(
        { google_refresh_token: tokens.refresh_token },
        { merge: true }
      );
      
      console.log("✅ Google Refresh Token guardado correctamente.");

      // Registro automático del Webhook
      try {
        await registerCalendarWatch({
          calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
          webhookUrl: `${frontendUrl}/api/webhooks/calendar`,
        });
      } catch (webhookErr) {
        console.error("⚠️ Error en auto-webhook:", webhookErr);
      }
    }

    return NextResponse.redirect(`${frontendUrl}/?google_sync=success`);
  } catch (error) {
    console.error("❌ Error en callback de Google:", error);
    return NextResponse.redirect(`${frontendUrl}/?error=GoogleSyncFailed`);
  }
}