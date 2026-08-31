import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { APP_URL, admin, type AuthedRequest } from './config.js';
import { observe, recordError } from './diagnostics.js';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  key?: (req: AuthedRequest) => string;
  message?: string;
};

type DistributedRateLimitOptions = RateLimitOptions & {
  namespace: string;
};


type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const trustedOrigins = new Set<string>([
  new URL(APP_URL).origin,
  ...String(process.env.TRUSTED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => {
      try { return new URL(value).origin; } catch { return ''; }
    })
    .filter(Boolean),
]);

function clientKey(req: AuthedRequest) {
  return req.authUser?.id ? `user:${req.authUser.id}` : `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' data:; worker-src 'self' blob:",
    );
  }
  next();
}

export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  // Bearer-token APIs are not cookie-authenticated, so non-browser clients may omit Origin.
  if (!origin) return next();
  if (trustedOrigins.has(origin)) return next();
  return res.status(403).json({ error: 'Request origin is not allowed.' });
}

export function rateLimit({ windowMs, max, key = clientKey, message = 'Too many requests. Please try again shortly.' }: RateLimitOptions): RequestHandler {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const now = Date.now();
    const bucketKey = `${req.route?.path || req.path}:${key(req)}`;
    const current = buckets.get(bucketKey);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    buckets.set(bucketKey, bucket);

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ error: message });
    }
    return next();
  };
}

export function distributedRateLimit({
  namespace,
  windowMs,
  max,
  key = clientKey,
  message = 'Too many requests. Please try again shortly.',
}: DistributedRateLimitOptions): RequestHandler {
  const localFallback = rateLimit({ windowMs, max, key, message });
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const adminClient = admin;
    if (!adminClient) return localFallback(req, res, next);
    const rateKey = `${namespace}:${key(req)}`.slice(0, 220);
    try {
      const { data, error } = await observe('supabase.rateLimit.consume', () => adminClient.rpc('consume_api_rate_limit', {
        p_key: rateKey,
        p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
        p_limit: max,
      }), 750);
      if (error) throw error;
      const result = (data && typeof data === 'object' ? data : {}) as { allowed?: boolean; remaining?: number; reset_at?: string };
      res.setHeader('RateLimit-Limit', String(max));
      if (Number.isFinite(Number(result.remaining))) res.setHeader('RateLimit-Remaining', String(Math.max(0, Number(result.remaining))));
      if (result.reset_at) {
        const resetAt = Date.parse(result.reset_at);
        if (Number.isFinite(resetAt)) res.setHeader('RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
      }
      if (result.allowed === false) {
        if (result.reset_at) {
          const seconds = Math.ceil((Date.parse(result.reset_at) - Date.now()) / 1000);
          if (Number.isFinite(seconds)) res.setHeader('Retry-After', String(Math.max(1, seconds)));
        }
        return res.status(429).json({ error: message });
      }
      return next();
    } catch (error) {
      recordError(error, 'distributed_rate_limit_fallback', { namespace, requestId: req.requestId });
      return localFallback(req, res, next);
    }
  };
}

export const creditReadLimit = rateLimit({ windowMs: 60_000, max: 60 });
export const checkoutLimit = distributedRateLimit({ namespace:'checkout', windowMs: 60_000, max: 6, message: 'Too many checkout attempts. Please wait a minute and try again.' });
export const generationLimit = distributedRateLimit({ namespace:'generation', windowMs: 10 * 60_000, max: 8, message: 'Generation limit reached. Please wait before starting another render.' });
export const integrityLimit = distributedRateLimit({ namespace:'integrity', windowMs: 5 * 60_000, max: 6, message: 'Too many account self-checks. Please wait a few minutes.' });
export const publicReadLimit = rateLimit({ windowMs: 60_000, max: 120 });

// Keep the in-memory limiter bounded in long-running single-instance deployments.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 5 * 60_000).unref();
