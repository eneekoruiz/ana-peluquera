import { google } from "googleapis";
import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import crypto from "node:crypto";

/**
 * GET /api/auth/google
 * Inicia el flujo de OAuth2 para Google Calendar.
 * 🔒 PROTECCIÓN: Solo accesible por el administrador logueado.
 */
export async function GET(request: Request) {
  // Solo permitimos que el admin inicie el proceso de vinculación
  const auth = await requireAdminRequest(request);
  if (!auth.authorized) return auth.response;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Generamos un 'state' aleatorio para prevenir CSRF
  const state = crypto.randomBytes(32).toString('hex');
  
  // En producción, este state debería guardarse en una cookie segura/HTTPOnly 
  // para verificarlo en el callback.
  const response = NextResponse.redirect(oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
    state: state,
  }));

  // Guardamos el state en una cookie temporal de 10 min
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, 
  });

  return response;
}