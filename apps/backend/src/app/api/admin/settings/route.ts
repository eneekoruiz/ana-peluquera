import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';

// ✅ Configuramos CORS para que tu web (puerto 8080) pueda leer estos datos
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * GET: Devuelve la configuración global del admin (como el email oficial)
 */
export async function GET() {
  try {
    const db = getFirebaseAdminApp().firestore();
    
    // 🔍 Leemos el documento que creaste en la consola de Firebase
    const adminDoc = await db.collection('settings').doc('admin').get();

    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Configuración no encontrada en Firestore' }, 
        { status: 404, headers: corsHeaders }
      );
    }

    const data = adminDoc.data();

    // Devolvemos el email para que el frontend sepa quién manda
    return NextResponse.json({
      email: data?.email,
      // Aquí puedes añadir más cosas en el futuro (ej: teléfono del salón)
    }, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("❌ Error al obtener settings:", error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}