import { NextResponse } from 'next/server';
import { getFirebaseAdminApp, getDb } from '@/lib/firebaseAdmin';
import { requireAdminRequest } from '@/lib/auth';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://eneko-ruiz.vercel.app')
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
 * 🛡️ DEFENSA EN PROFUNDIDAD: Validamos admin tanto en middleware como en el handler.
 */
export async function GET(request: Request) {
  const headers = getCorsHeaders(request);
  
  // 🔐 Verificación de administrador (Doble capa de seguridad)
  const auth = await requireAdminRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const db = getDb();
    const adminDoc = await db.collection('settings').doc('admin').get();

    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Configuration not found' }, 
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
    console.error("❌ Error in GET settings:", error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers }
    );
  }
}