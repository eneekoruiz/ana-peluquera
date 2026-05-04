import { checkCalendarSyncStatus } from '@/lib/googleCalendar';
import { isRateLimited, getRateLimitResponse } from '@/lib/rateLimiter';

import { db } from '@/lib/firebaseAdmin';
import { readCalendarWatchConfig, registerCalendarWatch } from '@/lib/calendarWebhookSync';
import dayjs from 'dayjs';


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (isRateLimited(request, 'calendar-status', 10)) {
    return getRateLimitResponse();
  }
  try {

    const status = await checkCalendarSyncStatus();
    
    // 🚀 AUTO-RENEWAL: Si el webhook expira pronto, lo renovamos
    if (status.status === 'connected') {
      try {
        const settingsSnap = await db.collection("admin").doc("settings").get();
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

    return NextResponse.json(status);

  } catch (error) {
    console.error("Error in calendar status route:", error);
    return NextResponse.json({ status: 'disconnected', error: 'Internal server error' }, { status: 500 });
  }
}
