import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight in-memory rate limiter (token bucket).
 *
 * For Phase 5 hardening this is sufficient — it survives a single Next.js
 * worker process. When we scale beyond a single replica we swap the bucket
 * store for Redis (`@upstash/ratelimit`) without changing call sites.
 *
 * Buckets are keyed by either:
 *   - the lowercase wallet address (preferred for authenticated routes)
 *   - the client IP (best-effort) as a fallback for public endpoints
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitConfig {
  /** Bucket capacity (max requests in a burst). */
  capacity: number;
  /** Tokens refilled per second. e.g. 10 capacity / 60s window → refillPerSec = 10/60. */
  refillPerSec: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);
  const bucket: Bucket = existing
    ? { ...existing }
    : { tokens: config.capacity, updatedAt: now };

  const elapsedSec = (now - bucket.updatedAt) / 1000;
  bucket.tokens = Math.min(
    config.capacity,
    bucket.tokens + elapsedSec * config.refillPerSec,
  );
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    store.set(key, bucket);
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((1 - bucket.tokens) / config.refillPerSec),
    };
  }

  bucket.tokens -= 1;
  store.set(key, bucket);
  return {
    ok: true,
    remaining: Math.floor(bucket.tokens),
    retryAfterSec: 0,
  };
}

/**
 * Periodic GC so the in-memory map doesn't leak. Buckets that have been at
 * full capacity for >10 minutes are dropped.
 */
const GC_INTERVAL_MS = 60_000;
let gcTimer: ReturnType<typeof setInterval> | null = null;
function startGc() {
  if (gcTimer) return;
  gcTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, b] of store) {
      if (now - b.updatedAt > 10 * 60_000) store.delete(key);
    }
  }, GC_INTERVAL_MS);
  // Don't keep the Node event loop alive on shutdown.
  gcTimer.unref?.();
}
startGc();

export function getClientIp(req: NextRequest): string {
  // Prefer X-Forwarded-For (Vercel/Railway) → first IP in chain.
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Helper: enforce a rate limit and return a 429 NextResponse on miss.
 * Returns null if the request may proceed.
 */
export function enforceRateLimit(
  key: string,
  config: RateLimitConfig,
): NextResponse | null {
  const result = rateLimit(key, config);
  if (result.ok) return null;
  const res = NextResponse.json(
    { error: 'rate_limited', retryAfter: result.retryAfterSec },
    { status: 429 },
  );
  res.headers.set('Retry-After', String(result.retryAfterSec));
  return res;
}

/** Common presets so route handlers don't reinvent thresholds. */
export const RATE_LIMITS = {
  /** Quest claim: 10 per minute per wallet. */
  QUEST_CLAIM: { capacity: 10, refillPerSec: 10 / 60 },
  /** OAuth start (per IP): 20 per minute. */
  OAUTH_START: { capacity: 20, refillPerSec: 20 / 60 },
  /** Withdrawal: 5 per hour per wallet. */
  WITHDRAWAL: { capacity: 5, refillPerSec: 5 / 3600 },
  /** SIWE nonce / verify: 30 per minute per IP. */
  AUTH: { capacity: 30, refillPerSec: 30 / 60 },
  /** Generic write: 60 per minute per wallet. */
  WRITE: { capacity: 60, refillPerSec: 1 },
} as const;
