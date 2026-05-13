import { google } from 'googleapis';
import { getFirebaseAdminApp, getDb } from '@/lib/firebaseAdmin';

// 🚀 PASO 3: Obtener un cliente de calendario listo para usar según la peluquería
export async function getCalendarClientForSalon(salonId: string) {
  const db = getDb();
  const doc = await db.collection('salons').doc(salonId).get();
  
  if (!doc.exists) {
    throw new Error(`La peluquería ${salonId} no existe en la base de datos.`);
  }
  
  const tokens = doc.data()?.googleCalendarTokens;
  if (!tokens) {
    throw new Error(`La peluquería ${salonId} no ha conectado su Google Calendar.`);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Cargamos los tokens del peluquero
  oauth2Client.setCredentials(tokens);

  // 🔥 MAGIA DE ALTA EFICIENCIA: Auto-renovación silenciosa
  // Si Google decide que el token ha caducado, la librería lo renueva sola por detrás.
  // Con este evento, cazamos los nuevos tokens y los guardamos en Firebase.
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      if (newTokens.refresh_token) {
        // Actualización completa
        await db.collection('salons').doc(salonId).set({
          googleCalendarTokens: newTokens
        }, { merge: true });
      } else {
        // A veces Google solo renueva el access_token, dejamos el refresh_token intacto
        await db.collection('salons').doc(salonId).set({
          'googleCalendarTokens.access_token': newTokens.access_token,
          'googleCalendarTokens.expiry_date': newTokens.expiry_date
        }, { merge: true });
      }
      console.log(`✅ Tokens renovados y guardados para la peluquería ${salonId}`);
    } catch (error) {
      console.error("❌ Error guardando los nuevos tokens en Firebase:", error);
    }
  });

  // Devolvemos la instancia del calendario ya autenticada para ESTE peluquero en concreto
  return google.calendar({ version: 'v3', auth: oauth2Client });
}