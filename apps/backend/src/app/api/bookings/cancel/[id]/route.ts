import { NextResponse } from "next/server";
import { cancelBookingByToken } from "@/lib/bookingService";
import { getCorsHeaders } from '@/lib/cors';

// Use shared `getCorsHeaders` from `src/lib/cors`.

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