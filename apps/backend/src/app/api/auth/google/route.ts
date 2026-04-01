import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Crítico para obtener el refresh_token
    prompt: 'consent',      // Forzamos a que siempre nos dé el refresh_token
    scope: ['https://www.googleapis.com/auth/calendar'],
  });

  return NextResponse.redirect(url);
}