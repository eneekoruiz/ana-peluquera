import { NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('origin');
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : (ALLOWED_ORIGINS[0] || ''),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

/**
 * GET: Devuelve la configuración global del admin (como el email oficial)
 * Protegido por middleware (/api/admin/*)
 */
export async function GET(request: Request) {
  const headers = getCorsHeaders(request);

  try {
    const db = getFirebaseAdminApp().firestore();
    const adminDoc = await db.collection('settings').doc('admin').get();

    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Configuración no encontrada' }, 
        { status: 404, headers }
      );
    }

    const data = adminDoc.data();

    return NextResponse.json({
      email: data?.email,
    }, { 
      status: 200, 
      headers 
    });

  } catch (error) {
    console.error("❌ Error en GET settings:", error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers }
    );
  }
}