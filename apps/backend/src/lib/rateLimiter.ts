import { NextResponse } from 'next/server';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// Almacén en memoria (volátil, pero suficiente para Vercel lambdas en caliente)
const rateStore: Map<string, RateLimitEntry> =
  (globalThis as { __globalRateStore?: Map<string, RateLimitEntry> }).__globalRateStore ||
  new Map<string, RateLimitEntry>();

(globalThis as { __globalRateStore?: Map<string, RateLimitEntry> }).__globalRateStore = rateStore;

const WINDOW_MS = 60_000;

export function isRateLimited(request: Request, scope: string, maxRequests = 30): boolean {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') || 'unknown');
  
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const entry = rateStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  rateStore.set(key, entry);
  return entry.count > maxRequests;
}

export function getRateLimitResponse() {
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, 
    { status: 429 }
  );
}
