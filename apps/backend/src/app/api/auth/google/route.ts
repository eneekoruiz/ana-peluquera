import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Generamos la URL de Google para que Ana inicie sesión
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // Crítico: Nos da un "Refresh Token" para conectarnos cuando Ana no esté
    prompt: "consent",      // Fuerza a que salga la pantalla de aceptar permisos
    scope: ["https://www.googleapis.com/auth/calendar"],
  });

  return NextResponse.redirect(url);
}