const DEFAULT_ALLOWED_ORIGINS = [
  'https://agpeluqueria.vercel.app',
  'https://eneko-ruiz.vercel.app',
  'https://ana-peluqueria.vercel.app',
  'https://ana-peluquera.vercel.app',
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/^['\"]|['\"]$/g, '');
}

export function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS ?? '';
  const parsed = raw
    .split(/[\n,]/)
    .map(normalizeOrigin)
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS;
}

export function getCorsHeaders(
  request: Request,
  methods = 'GET, POST, PUT, DELETE, OPTIONS'
): Record<string, string> {
  const origin = request.headers.get('origin')?.trim() || '';
  const isAllowed = origin && getAllowedOrigins().includes(origin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };

  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}