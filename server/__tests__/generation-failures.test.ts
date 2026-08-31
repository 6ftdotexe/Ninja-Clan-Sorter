import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import type { AuthedRequest } from '../config.js';

const mocks = vi.hoisted(() => ({
  reserveCredits: vi.fn(),
  getCredits: vi.fn(),
  grantCredits: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('../config.js', () => ({
  OPENAI_IMAGE_MODEL: 'gpt-image-test',
  admin: {},
  reserveCredits: mocks.reserveCredits,
  getCredits: mocks.getCredits,
  grantCredits: mocks.grantCredits,
  requireAdmin: mocks.requireAdmin,
}));

vi.mock('../diagnostics.js', () => ({
  logEvent: vi.fn(),
  recordError: vi.fn(),
  observe: async (_name: string, operation: () => Promise<unknown>) => operation(),
}));

import { handleGenerateShinobi } from '../generation.js';

type TestResponse = Response & { statusCode: number; body: any };

function responseMock(): TestResponse {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(this: TestResponse, code: number) { this.statusCode = code; return this; },
    json(this: TestResponse, body: unknown) { this.body = body; return this; },
  } as unknown as TestResponse;
}

function requestMock(): AuthedRequest {
  return {
    authUser: { id: 'user-regression', email: 'test@example.invalid' },
    requestId: 'generation-regression-1',
    body: {
      photoDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      prompt: 'Adult shinobi profile with careful tactical planning, water chakra control, and reconnaissance expertise.',
      mode: 'full-body',
      quality: 'medium',
    },
  } as AuthedRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = 'test-key';
});

describe('generation failure recovery', () => {
  it('returns 402 without creating a generation when the wallet is short', async () => {
    mocks.reserveCredits.mockResolvedValue(-1);
    mocks.getCredits.mockResolvedValue(0);
    const res = responseMock();

    await handleGenerateShinobi(requestMock(), res);

    expect(res.statusCode).toBe(402);
    expect(res.body.code).toBe('INSUFFICIENT_CREDITS');
    expect(mocks.grantCredits).not.toHaveBeenCalled();
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });

  it('refunds a reserved credit when the one-processing-generation guard rejects a duplicate', async () => {
    mocks.reserveCredits.mockResolvedValue(4);
    mocks.grantCredits.mockResolvedValue(5);
    mocks.requireAdmin.mockReturnValue({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { code: '23505', message: 'duplicate key' } }),
          }),
        }),
      }),
    });
    const res = responseMock();

    await handleGenerateShinobi(requestMock(), res);

    expect(res.statusCode).toBe(409);
    expect(res.body.creditsRefunded).toBe(true);
    expect(res.body.error).toContain('already in progress');
    expect(mocks.grantCredits).toHaveBeenCalledWith('user-regression', 1);
  });
});
