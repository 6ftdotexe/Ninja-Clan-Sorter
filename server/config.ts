import type { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { observe, recordError } from './diagnostics.js';

export type PortraitMode = 'portrait' | 'full-body' | 'action' | 'dossier';
export type GenerationQuality = 'medium' | 'high';
export type AuthedRequest = Request & {
  authUser?: { id: string; email?: string | null };
  requestId?: string;
};

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
export const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
export const admin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-2';
export const APP_URL = (process.env.APP_URL?.trim() || 'http://localhost:5173').replace(/\/$/, '');

export const CREDIT_PACKS = {
  single: { credits: 1, cents: 199, label: '1 Shinobi Generation Credit' },
  triple: { credits: 3, cents: 499, label: '3 Shinobi Generation Credits' },
  ten: { credits: 10, cents: 1299, label: '10 Shinobi Generation Credits' },
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS;

export const serverStatus = {
  service: 'shinobi-v10',
  imageProvider: 'openai',
  imageModel: OPENAI_IMAGE_MODEL,
  paymentsConfigured: Boolean(stripe && stripeWebhookSecret),
  accountsConfigured: Boolean(admin),
};


export type ConfigurationValidation = { errors: string[]; warnings: string[] };

export function validateConfiguration(options: { strict?: boolean } = {}): ConfigurationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const production = process.env.NODE_ENV === 'production';
  const strict = options.strict ?? production;
  const reportRequired = (message: string) => (strict ? errors : warnings).push(message);

  if (!supabaseUrl) reportRequired('SUPABASE_URL is required for cloud/account features.');
  if (!supabaseServiceKey) reportRequired('SUPABASE_SERVICE_ROLE_KEY is required for cloud/account features.');

  let appUrl: URL | null = null;
  try { appUrl = new URL(APP_URL); } catch { errors.push('APP_URL must be a valid absolute URL.'); }
  if (production && appUrl && appUrl.protocol !== 'https:') errors.push('APP_URL must use HTTPS in production.');
  if (production && APP_URL.includes('localhost')) errors.push('APP_URL cannot point to localhost in production.');
  const port = Number(process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT must be an integer between 1 and 65535.');

  if (!process.env.OPENAI_API_KEY?.trim()) warnings.push('OPENAI_API_KEY is missing; image generation will be unavailable.');
  if (!stripeSecret) warnings.push('STRIPE_SECRET_KEY is missing; checkout will be unavailable.');
  if (!stripeWebhookSecret) warnings.push('STRIPE_WEBHOOK_SECRET is missing; Stripe fulfillment will be unavailable.');
  if (Boolean(stripeSecret) !== Boolean(stripeWebhookSecret)) warnings.push('Stripe configuration is partial; checkout/fulfillment will remain degraded until both Stripe secrets are set.');
  if (production && !process.env.DIAGNOSTICS_TOKEN?.trim()) warnings.push('DIAGNOSTICS_TOKEN is unset; internal diagnostics will remain disabled.');

  const trusted = (process.env.TRUSTED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  for (const origin of trusted) {
    try { new URL(origin); } catch { errors.push(`TRUSTED_ORIGINS contains an invalid URL: ${origin}`); }
  }

  return { errors, warnings };
}

export function requireAdmin() {
  if (!admin) throw new Error('Supabase admin client is unavailable.');
  return admin;
}

export async function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!admin) return res.status(503).json({ error: 'Server Supabase credentials are not configured.' });

  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });

  try {
    const { data, error } = await observe('supabase.auth.getUser', () => admin.auth.getUser(token), 750);
    if (error || !data.user) return res.status(401).json({ error: 'Your session is invalid or expired.' });
    req.authUser = { id: data.user.id, email: data.user.email };
    return next();
  } catch (error) {
    recordError(error, 'auth_lookup_failed', { requestId: req.requestId });
    return res.status(503).json({ error: 'Account verification is temporarily unavailable.' });
  }
}

export async function getCredits(userId: string) {
  if (!admin) return 0;
  const { data, error } = await observe('supabase.wallet.get', () => admin
    .from('generation_wallets')
    .select('credits')
    .eq('user_id', userId)
    .maybeSingle(), 750);
  if (error) throw error;
  return Number(data?.credits || 0);
}

export async function reserveCredits(userId: string, amount: number) {
  const client = requireAdmin();
  const { data, error } = await observe('supabase.wallet.reserve', () => client.rpc('reserve_generation_credits', {
    p_user_id: userId,
    p_amount: amount,
  }), 750);
  if (error) throw error;
  return Number(data);
}

export async function recordGenerationPayment(input: {
  userId: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  credits: number;
  amountCents: number;
  currency: string;
}) {
  const client = requireAdmin();
  const { data, error } = await observe('supabase.payment.record', () => client.rpc('record_generation_payment', {
    p_user_id: input.userId,
    p_stripe_session_id: input.stripeSessionId,
    p_stripe_payment_intent_id: input.stripePaymentIntentId,
    p_credits: input.credits,
    p_amount_cents: input.amountCents,
    p_currency: input.currency,
  }), 1000);
  if (error) throw error;
  return Boolean(data);
}

export async function grantCredits(userId: string, amount: number) {
  const client = requireAdmin();
  const { data, error } = await observe('supabase.wallet.grant', () => client.rpc('grant_generation_credits', {
    p_user_id: userId,
    p_amount: amount,
  }), 750);
  if (error) throw error;
  return Number(data);
}
