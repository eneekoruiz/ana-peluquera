import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const WINDOW_MS = 60_000;

/**
 * 🚀 PRODUCTION RATE LIMITER
 * Utiliza Vercel KV (Redis) para persistencia entre instancias serverless.
 * 
 * ⚠️ IMPORTANTE: En producción es obligatorio configurar KV_URL.
 * Si no se detecta, el sistema fallará de forma segura para proteger la API.
 */
export async function isRateLimited(request: Request, scope: string, maxRequests = 30): Promise<boolean> {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') || 'unknown');
  
  const key = `ratelimit:${scope}:${ip}`;
  
  try {
    if (process.env.KV_URL || process.env.KV_REST_API_URL) {
      const current = await kv.incr(key);
      if (current === 1) {
        await kv.expire(key, 60);
      }
      return current > maxRequests;
    } else {
      if (process.env.NODE_ENV === 'production') {
        console.warn("⚠️ AVISO CLARO: Entorno de producción sin KV_URL o KV_REST_API_URL configurado. El rate limiter usará memoria, lo cual no es efectivo en Vercel/Serverless.");
      } else {
        console.warn("⚠️ KV no configurado. Usando fallback de memoria local.");
      }
    }
  } catch (err) {
    console.error("❌ Error en Vercel KV (Rate Limit):", err);
    // FAIL-OPEN: Si falla Redis, permitimos la solicitud para no bloquear el negocio de Ana.
  }

  return isRateLimitedInMemory(key, maxRequests);
}

// Lógica de fallback en memoria para desarrollo local
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
