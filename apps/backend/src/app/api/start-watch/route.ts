import { NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "../../../lib/firebaseAdmin"; // Ajusta la ruta si es necesario

// Función para obtener las credenciales (igual que en tu googleCalendar.ts)
function getGoogleAuthClient() {
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  let creds;
  if (jsonPath!.trim().startsWith('{')) {
      creds = JSON.parse(jsonPath!);
  } else {
      creds = require("fs").readFileSync(require("path").resolve(process.cwd(), jsonPath!), "utf8");
      creds = JSON.parse(creds);
  }
  return new google.auth.GoogleAuth({
    credentials: { client_email: creds.client_email, private_key: creds.private_key },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

export async function GET() {
  try {
    const auth = getGoogleAuthClient();
    const calendar = google.calendar({ version: "v3", auth });
    
    // Generamos un ID único para este chivato
    const channelId = "ag-beauty-watch-" + Date.now();
    
    // Pon aquí la URL EXACTA de tu backend terminada en /api/webhooks/google-calendar
    const webhookUrl = "https://PEGA_AQUI_TU_URL_DE_VERCEL.vercel.app/api/webhooks/google-calendar";

    const response = await calendar.events.watch({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
      },
    });

    // Guardamos el channelId en Firebase por si en el futuro queremos apagarlo
    await db.collection("admin").doc("calendar_watch").set({
      channelId: channelId,
      resourceId: response.data.resourceId,
      expiration: response.data.expiration
    });

    return NextResponse.json({ success: true, message: "¡Chivato encendido!", data: response.data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}