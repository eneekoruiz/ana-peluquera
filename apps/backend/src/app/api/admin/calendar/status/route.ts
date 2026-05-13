import { NextResponse } from 'next/server';
import { checkCalendarSyncStatus } from '@/lib/googleCalendar';
import { isRateLimited, getRateLimitResponse } from '@/lib/rateLimiter';
import { requireAdminRequest } from '@/lib/auth';
import { getDb } from '@/lib/firebaseAdmin';
import { readCalendarWatchConfig, registerCalendarWatch } from '@/lib/calendarWebhookSync';
import dayjs from 'dayjs';

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

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.authorized) return auth.response;

  const headers = getCorsHeaders(request);

  if (await isRateLimited(request, 'calendar-status', 10)) {
    return getRateLimitResponse();
  }
  try {

    const status = await checkCalendarSyncStatus();
    
    // 🚀 AUTO-RENEWAL: Si el webhook expira pronto, lo renovamos
    if (status.status === 'connected') {
      try {
        const settingsSnap = await getDb().collection("settings").doc("admin").get();
        const watchConfig = readCalendarWatchConfig(settingsSnap.data());
        
        if (watchConfig?.expiration) {
          const exp = dayjs(watchConfig.expiration);
          const diffHours = exp.diff(dayjs(), 'hour');
          
          // Si expira en menos de 48 horas, renovamos
          if (diffHours < 48) {
            console.log(`🔄 Webhook expira en ${diffHours}h. Renovando automáticamente...`);
            await registerCalendarWatch({
              calendarId: watchConfig.calendarId,
              webhookUrl: watchConfig.webhookUrl,
            });
          }
        }
      } catch (renewErr) {
        console.error("⚠️ Error al intentar renovar el webhook automáticamente:", renewErr);
      }
    }

    return NextResponse.json(status, { headers });

  } catch (error) {
    console.error("Error in calendar status route:", error);
    return NextResponse.json({ status: 'disconnected', error: 'Internal server error' }, { status: 500, headers });
  }
}
