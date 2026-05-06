import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const WINDOW_MS = 60_000;

/**
 * 🚀 Rate Limiter distribuido usando Vercel KV (Redis)
 * Si no hay KV configurado, hace fallback a memoria (menos fiable en serverless)
 */
export async function isRateLimited(request: Request, scope: string, maxRequests = 30): Promise<boolean> {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') || 'unknown');
  
  const key = `ratelimit:${scope}:${ip}`;
  
  try {
    // Si estamos en Vercel con KV habilitado
    if (process.env.KV_URL) {
      const current = await kv.incr(key);
      if (current === 1) {
        await kv.expire(key, 60);
      }
      return current > maxRequests;
    }
  } catch (err) {
    console.error("⚠️ Error en Vercel KV, usando fallback de memoria:", err);
  }

  // FALLBACK: Memoria (solo para desarrollo o fallos de KV)
  return isRateLimitedInMemory(key, maxRequests);
}

// Lógica de fallback en memoria
type RateLimitEntry = { count: number; resetAt: number; };
const rateStore: Map<string, RateLimitEntry> = (globalThis as any).__globalRateStore || new Map();
(globalThis as any).__globalRateStore = rateStore;

function isRateLimitedInMemory(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const entry = rateStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > maxRequests;
}

export function getRateLimitResponse() {
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, 
    { status: 429 }
  );
}
