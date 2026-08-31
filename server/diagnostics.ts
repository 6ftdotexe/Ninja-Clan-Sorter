import { randomUUID, timingSafeEqual } from 'node:crypto';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

type LogLevel = 'info' | 'warn' | 'error';
type ErrorCategory = 'validation' | 'auth' | 'rate_limit' | 'payment' | 'generation' | 'database' | 'timeout' | 'network' | 'internal';
type Timing = { count: number; totalMs: number; maxMs: number; slow: number; failures: number };
type RouteMetric = { count: number; errors: number; totalMs: number; maxMs: number };

const startedAt = Date.now();
const timings = new Map<string, Timing>();
const routes = new Map<string, RouteMetric>();
const errors = new Map<ErrorCategory, number>();
const eventLoop = monitorEventLoopDelay({ resolution: 20 });
eventLoop.enable();

function finite(value: number) { return Number.isFinite(value) ? value : 0; }
function round(value: number) { return Math.round(value * 10) / 10; }

export function classifyError(error: unknown): ErrorCategory {
  const obj = (error && typeof error === 'object' ? error : {}) as { name?: string; code?: string; status?: number; message?: string };
  const message = `${obj.name || ''} ${obj.code || ''} ${obj.message || ''}`.toLowerCase();
  if (obj.status === 401 || obj.status === 403 || message.includes('auth') || message.includes('session')) return 'auth';
  if (obj.status === 429 || message.includes('rate limit')) return 'rate_limit';
  if (message.includes('stripe') || message.includes('checkout') || message.includes('payment')) return 'payment';
  if (message.includes('openai') || message.includes('generation') || message.includes('image')) return 'generation';
  if (message.includes('timeout') || message.includes('abort')) return 'timeout';
  if (message.includes('supabase') || message.includes('postgres') || message.includes('database') || /^[0-9]{5}$/.test(obj.code || '')) return 'database';
  if (message.includes('fetch') || message.includes('network') || message.includes('econn')) return 'network';
  if (obj.status === 400 || message.includes('invalid') || message.includes('required')) return 'validation';
  return 'internal';
}

export function logEvent(level: LogLevel, event: string, fields: Record<string, unknown> = {}) {
  const payload = { ts: new Date().toISOString(), level, event, ...fields };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function recordError(error: unknown, event: string, fields: Record<string, unknown> = {}) {
  const category = classifyError(error);
  errors.set(category, (errors.get(category) || 0) + 1);
  const safe = error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) };
  logEvent('error', event, { category, ...fields, error: safe });
  return category;
}

export async function observe<T>(name: string, operation: () => PromiseLike<T>, slowThresholdMs = 1000): Promise<T> {
  const start = performance.now();
  let failed = false;
  try {
    return await operation();
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    const durationMs = performance.now() - start;
    const current = timings.get(name) || { count: 0, totalMs: 0, maxMs: 0, slow: 0, failures: 0 };
    current.count += 1;
    current.totalMs += durationMs;
    current.maxMs = Math.max(current.maxMs, durationMs);
    current.slow += durationMs >= slowThresholdMs ? 1 : 0;
    current.failures += failed ? 1 : 0;
    timings.set(name, current);
    if (durationMs >= slowThresholdMs) logEvent('warn', 'slow_operation', { operation: name, durationMs: round(durationMs), failed });
  }
}

export const requestDiagnostics: RequestHandler = (req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'];
  req.requestId = typeof requestId === 'string' && /^[A-Za-z0-9._:-]{8,100}$/.test(requestId) ? requestId : randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  const start = performance.now();
  res.on('finish', () => {
    const durationMs = performance.now() - start;
    const route = `${req.method} ${req.route?.path || req.path}`.slice(0, 160);
    const current = routes.get(route) || { count: 0, errors: 0, totalMs: 0, maxMs: 0 };
    current.count += 1;
    current.errors += res.statusCode >= 400 ? 1 : 0;
    current.totalMs += durationMs;
    current.maxMs = Math.max(current.maxMs, durationMs);
    routes.set(route, current);
    logEvent(res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info', 'http_request', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: round(durationMs),
      contentLength: Number(res.getHeader('content-length') || 0) || undefined,
    });
  });
  next();
};

export function diagnosticsSnapshot() {
  const memory = process.memoryUsage();
  const routeMetrics = Object.fromEntries([...routes.entries()].map(([key, value]) => [key, {
    count: value.count,
    errors: value.errors,
    avgMs: round(value.totalMs / Math.max(1, value.count)),
    maxMs: round(value.maxMs),
  }]));
  const operationMetrics = Object.fromEntries([...timings.entries()].map(([key, value]) => [key, {
    count: value.count,
    failures: value.failures,
    slow: value.slow,
    avgMs: round(value.totalMs / Math.max(1, value.count)),
    maxMs: round(value.maxMs),
  }]));
  return {
    collectedAt: new Date().toISOString(),
    startedAt: new Date(startedAt).toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    process: {
      pid: process.pid,
      node: process.version,
      memoryMb: {
        rss: round(memory.rss / 1024 / 1024),
        heapUsed: round(memory.heapUsed / 1024 / 1024),
        heapTotal: round(memory.heapTotal / 1024 / 1024),
        external: round(memory.external / 1024 / 1024),
      },
      eventLoopDelayMs: {
        mean: round(finite(eventLoop.mean / 1e6)),
        p95: round(finite(eventLoop.percentile(95) / 1e6)),
        max: round(finite(eventLoop.max / 1e6)),
      },
    },
    errors: Object.fromEntries(errors),
    routes: routeMetrics,
    operations: operationMetrics,
  };
}

export function requireDiagnosticsToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.DIAGNOSTICS_TOKEN?.trim();
  if (!expected) return res.status(404).json({ error: 'Not found.' });
  const supplied = req.headers['x-diagnostics-token'];
  if (typeof supplied !== 'string') return res.status(401).json({ error: 'Unauthorized.' });
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) return res.status(401).json({ error: 'Unauthorized.' });
  next();
}
