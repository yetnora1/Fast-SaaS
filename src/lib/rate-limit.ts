/**
 * Lightweight fixed-window rate limiter for public endpoints.
 *
 * In-memory, per server instance — on serverless this still throttles bursts
 * hitting a warm instance, which is what abuse looks like in practice. Swap for
 * Upstash/Redis when horizontal accuracy matters.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now >= w.resetAt) {
    if (windows.size >= MAX_KEYS) {
      // Cheap pressure valve: drop expired windows, or start over.
      for (const [k, v] of windows) if (now >= v.resetAt) windows.delete(k);
      if (windows.size >= MAX_KEYS) windows.clear();
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  w.count += 1;
  if (w.count > limit) {
    return { allowed: false, retryAfterSec: Math.ceil((w.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Guard a public route: returns a 429 Response when over budget, else null.
 * Keyed by route name + client IP (see clientIp in lib/api).
 */
export function limitPublic(req: Request, route: string, limit: number, windowMs: number): Response | null {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const { allowed, retryAfterSec } = rateLimit(`${route}:${ip}`, limit, windowMs);
  if (allowed) return null;
  return new Response(JSON.stringify({ ok: false, error: "Too many requests, slow down." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(retryAfterSec) },
  });
}
