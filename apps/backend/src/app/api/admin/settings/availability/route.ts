import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/auth';
import { getAvailableSlots } from '@/lib/bookingService';

// Configuración de CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * El Preflight es obligatorio para que el navegador permita la consulta.
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * GET: Devuelve los tramos ocupados del día solicitado.
 * Consulta tanto Firebase como Google Calendar (respetando la lógica de sándwich).
 */
export async function GET(request: Request) {
  // 🛡️ SEGURIDAD: Solo admins pueden consultar disponibilidad detallada
  const auth = await requireAdminRequest(request);
  if (!auth.authorized) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date'); // Se espera formato 'YYYY-MM-DD'

  if (!date) {
    return NextResponse.json(
      { error: 'La fecha es un parámetro obligatorio' }, 
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // 🚀 Llamamos a la lógica central que orquesta Google y Firebase
    // Esta función ya sabe que si hay un tinte, el hueco central está libre.
    const busySlots = await getAvailableSlots(date);

    return NextResponse.json(
      { busy: busySlots }, 
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("❌ Error en API Availability:", error);
    return NextResponse.json(
      { error: 'No se pudo obtener la disponibilidad del calendario' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}