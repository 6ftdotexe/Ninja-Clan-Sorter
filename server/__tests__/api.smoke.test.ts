import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../index.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Could not bind smoke-test server.');
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

describe('API smoke tests', () => {
  it('serves liveness with request correlation and security headers', async () => {
    const response = await fetch(`${baseUrl}/api/health/live`, { headers: { 'X-Request-ID': 'smoke-regression-123' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('smoke-regression-123');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json() as { ok: boolean; lifecycle: string };
    expect(body.ok).toBe(true);
    expect(['starting', 'ready']).toContain(body.lifecycle);
  });

  it('serves the public credit-pack contract', async () => {
    const response = await fetch(`${baseUrl}/api/credit-packs`);
    expect(response.status).toBe(200);
    const packs = await response.json() as Array<{ id: string; credits: number; cents: number }>;
    expect(packs.map(pack => pack.id)).toEqual(['single', 'triple', 'ten']);
    expect(packs.every(pack => pack.credits > 0 && pack.cents > 0)).toBe(true);
  });

  it('returns a controlled JSON 404 for unknown API routes', async () => {
    const response = await fetch(`${baseUrl}/api/does-not-exist`);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'API route not found.' });
  });

  it('does not expose internal diagnostics without the diagnostics secret', async () => {
    const response = await fetch(`${baseUrl}/api/internal/diagnostics`);
    expect([404, 401, 403]).toContain(response.status);
  });
});
