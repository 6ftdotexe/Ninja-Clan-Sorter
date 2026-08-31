import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { rateLimit, requireTrustedOrigin, securityHeaders } from '../security.js';
import { APP_URL, type AuthedRequest } from '../config.js';

type TestResponse = Response & { statusCode: number; body: any };

function responseMock(): { res: TestResponse; headers: Map<string, string> } {
  const headers = new Map<string, string>();
  const state = { statusCode: 200, body: undefined as unknown };
  const raw: Record<string, unknown> = {
    get statusCode() { return state.statusCode; },
    get body() { return state.body; },
  };
  raw.setHeader = (name: string, value: string) => { headers.set(name.toLowerCase(), String(value)); return raw; };
  raw.status = (code: number) => { state.statusCode = code; return raw; };
  raw.json = (body: unknown) => { state.body = body; return raw; };
  return { res: raw as unknown as TestResponse, headers };
}

describe('security middleware', () => {
  it('sets core browser security headers', () => {
    const { res, headers } = responseMock();
    const next = vi.fn() as NextFunction;
    securityHeaders({} as Request, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('x-frame-options')).toBe('DENY');
    expect(headers.get('referrer-policy')).toBe('no-referrer');
    expect(headers.get('cross-origin-opener-policy')).toBe('same-origin');
  });

  it('adds HSTS in production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { res, headers } = responseMock();
      securityHeaders({} as Request, res, vi.fn() as NextFunction);
      expect(headers.get('strict-transport-security')).toBe('max-age=31536000');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('allows the configured first-party origin and blocks an untrusted origin', () => {
    const next = vi.fn() as NextFunction;
    const trusted = responseMock();
    requireTrustedOrigin({ headers: { origin: new URL(APP_URL).origin } } as Request, trusted.res, next);
    expect(next).toHaveBeenCalledOnce();

    const blocked = responseMock();
    requireTrustedOrigin({ headers: { origin: 'https://evil.example' } } as Request, blocked.res, vi.fn());
    expect(blocked.res.statusCode).toBe(403);
    expect(blocked.res.body).toEqual({ error: 'Request origin is not allowed.' });
  });

  it('permits non-browser bearer-token clients with no Origin header', () => {
    const next = vi.fn() as NextFunction;
    const { res } = responseMock();
    requireTrustedOrigin({ headers: {} } as Request, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('enforces request limits and returns retry metadata', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    const req = { path: '/unit-rate', ip: '127.0.0.77', socket: {} } as unknown as AuthedRequest;

    for (let i = 0; i < 2; i += 1) {
      const { res } = responseMock();
      const next = vi.fn();
      limiter(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(200);
    }

    const limited = responseMock();
    const next = vi.fn();
    limiter(req, limited.res, next);
    expect(next).not.toHaveBeenCalled();
    expect(limited.res.statusCode).toBe(429);
    expect(limited.headers.get('ratelimit-limit')).toBe('2');
    expect(limited.headers.get('retry-after')).toBeTruthy();
  });
});
