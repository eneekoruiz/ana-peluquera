import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Falta el código de autorización' }, { status: 400 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Intercambiamos el código por los tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Lo guardamos en TU estructura actual (admin/settings)
    const db = getFirebaseAdminApp().firestore();
    await db.collection('admin').doc('settings').set({
      googleCalendarTokens: tokens,
      updatedAt: new Date().toISOString()
    }, { merge: true }); // Merge asegura que no borramos a los trabajadores ni las vacaciones

    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${frontendUrl}/admin/settings?google=success`);
    
  } catch (error) {
    console.error('❌ Error en el Callback:', error);
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${frontendUrl}/admin/settings?google=error`);
  }
}