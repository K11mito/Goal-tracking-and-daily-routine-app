// Simple in-memory IP-based rate limiter
// Resets on cold starts (acceptable for basic protection)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const LIMITS: Record<string, number> = {
  '/api/chat': 20,
  '/api/generate': 10,
  '/api/summarize': 5,
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function getClientIP(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0];
  return req.socket?.remoteAddress || 'unknown';
}

export function checkRateLimit(ip: string, endpoint: string): { allowed: boolean; remaining: number } {
  const limit = LIMITS[endpoint] || 20;
  const now = Date.now();
  const key = `${ip}:${endpoint}`;

  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit - entry.count };
}
