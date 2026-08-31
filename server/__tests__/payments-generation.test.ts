import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import {
  asGenerationQuality,
  asPortraitMode,
  buildOpenAIImagePrompt,
  generationCost,
  openAIImageSize,
  parseDataUrl,
  sanitizeProfilePrompt,
} from '../generation.js';
import { validateCompletedCheckoutSession } from '../payments.js';

function checkoutSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: 'cs_test_regression',
    object: 'checkout.session',
    client_reference_id: 'user-123',
    payment_status: 'paid',
    amount_subtotal: 499,
    amount_total: 499,
    currency: 'usd',
    metadata: { user_id: 'user-123', pack_id: 'triple', credits: '3' },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe('Stripe checkout validation', () => {
  it('accepts a server-defined paid credit pack', () => {
    const result = validateCompletedCheckoutSession(checkoutSession());
    expect(result).toEqual({ valid: true, userId: 'user-123', packId: 'triple', credits: 3, amountCents: 499 });
  });

  it.each([
    ['wrong credits', { metadata: { user_id: 'user-123', pack_id: 'triple', credits: '99' } }],
    ['wrong subtotal', { amount_subtotal: 1 }],
    ['overcharge', { amount_total: 999 }],
    ['wrong currency', { currency: 'eur' }],
    ['wrong owner', { client_reference_id: 'attacker' }],
    ['unpaid', { payment_status: 'unpaid' }],
    ['unknown pack', { metadata: { user_id: 'user-123', pack_id: 'made-up', credits: '3' } }],
  ] as const)('rejects %s', (_name, overrides) => {
    expect(validateCompletedCheckoutSession(checkoutSession(overrides as Partial<Stripe.Checkout.Session>)).valid).toBe(false);
  });

  it('allows a legitimate promotion-code discount', () => {
    expect(validateCompletedCheckoutSession(checkoutSession({ amount_total: 399 })).valid).toBe(true);
  });
});

describe('generation input contracts', () => {
  it('normalizes only supported modes and quality levels', () => {
    expect(asPortraitMode('action')).toBe('action');
    expect(asPortraitMode('invalid')).toBe('full-body');
    expect(asGenerationQuality('high')).toBe('high');
    expect(asGenerationQuality('ultra')).toBe('medium');
  });

  it('keeps generation cost and image dimensions deterministic', () => {
    expect(generationCost('medium')).toBe(1);
    expect(generationCost('high')).toBe(2);
    expect(openAIImageSize('portrait')).toBe('1024x1024');
    expect(openAIImageSize('action')).toBe('1536x1024');
    expect(openAIImageSize('full-body')).toBe('1024x1536');
  });

  it('rejects invalid reference image types and accepts allowed image data URLs', () => {
    expect(parseDataUrl('data:image/gif;base64,R0lGODlh')).toBeNull();
    expect(parseDataUrl('not-a-data-url')).toBeNull();
    const parsed = parseDataUrl('data:image/png;base64,iVBORw0KGgo=');
    expect(parsed?.mime).toBe('image/png');
    expect(parsed?.bytes.length).toBeGreaterThan(0);
  });

  it('rejects short/oversized prompts and strips control characters', () => {
    expect(sanitizeProfilePrompt('too short')).toBeNull();
    expect(sanitizeProfilePrompt('x'.repeat(7001))).toBeNull();
    const prompt = `Adult shinobi profile with tactical detail and chakra control.\u0000 More identity detail.`;
    expect(sanitizeProfilePrompt(prompt)).not.toContain('\u0000');
  });

  it('builds an original-character prompt without copying a named character requirement', () => {
    const prompt = buildOpenAIImagePrompt('Adult shinobi with Water chakra and reconnaissance focus.', 'dossier');
    expect(prompt).toContain('ORIGINAL anime shinobi character');
    expect(prompt).toContain('Do not copy or closely recreate any named canon anime character');
    expect(prompt).toContain('clean vertical full-body character-sheet composition');
  });
});


describe('checkout redirect routing contract', () => {
  it('returns Stripe to the HashRouter generator route', async () => {
    const source = await (await import('node:fs/promises')).readFile(new URL('../payments.ts', import.meta.url), 'utf8');
    expect(source).toContain('/#/generator?purchase=success');
    expect(source).toContain('/#/generator?purchase=cancelled');
  });
});
