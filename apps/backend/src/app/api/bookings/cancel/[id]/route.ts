import { NextResponse } from "next/server";
import { cancelBookingByToken } from "@/lib/bookingService";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://eneko-ruiz.vercel.app,https://ana-peluqueria.vercel.app,https://ana-peluquera.vercel.app')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : (ALLOWED_ORIGINS[0] || '');

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const headers = getCorsHeaders(request);
  try {
    const rawToken = params.id;
    await cancelBookingByToken(rawToken);
    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch (error: any) {
    console.error("❌ Error grave en cancelación pública:", error);
    const status = error.message === "INVALID_TOKEN" ? 403 : 500;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status, headers });
  }
}