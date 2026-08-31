import type { Request, Response } from 'express';
import Stripe from 'stripe';
import {
  APP_URL,
  CREDIT_PACKS,
  type AuthedRequest,
  type CreditPackId,
  admin,
  recordGenerationPayment,
  stripe,
  stripeWebhookSecret,
} from './config.js';
import { logEvent, observe, recordError } from './diagnostics.js';


export type CheckoutValidation = {
  valid: boolean;
  userId: string | null;
  packId: CreditPackId | null;
  credits: number;
  amountCents: number;
};

export function validateCompletedCheckoutSession(session: Stripe.Checkout.Session): CheckoutValidation {
  const userId = session.metadata?.user_id || null;
  const rawPackId = session.metadata?.pack_id;
  const packId = rawPackId && rawPackId in CREDIT_PACKS ? rawPackId as CreditPackId : null;
  const pack = packId ? CREDIT_PACKS[packId] : undefined;
  const metadataCredits = Number(session.metadata?.credits || 0);
  const amountSubtotal = session.amount_subtotal ?? -1;
  const amountTotal = session.amount_total ?? -1;
  const currency = (session.currency || '').toLowerCase();
  const valid = Boolean(
    userId &&
    pack &&
    session.client_reference_id === userId &&
    session.payment_status === 'paid' &&
    Number.isInteger(metadataCredits) &&
    metadataCredits === pack.credits &&
    amountSubtotal === pack.cents &&
    amountTotal >= 0 && amountTotal <= pack.cents &&
    currency === 'usd'
  );
  return { valid, userId, packId, credits: pack?.credits || 0, amountCents: amountTotal };
}

export async function handleStripeWebhook(req: Request, res: Response) {
  if (!stripe || !stripeWebhookSecret || !admin) {
    return res.status(503).send('Stripe webhook is not configured.');
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') return res.status(400).send('Missing Stripe signature.');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (error) {
    recordError(error, 'stripe_webhook_signature_failed');
    return res.status(400).send('Invalid webhook signature.');
  }

  if (event.type !== 'checkout.session.completed') return res.json({ received: true });

  const session = event.data.object as Stripe.Checkout.Session;
  const validation = validateCompletedCheckoutSession(session);
  const { userId, packId, amountCents } = validation;
  const pack = packId ? CREDIT_PACKS[packId] : undefined;

  if (!validation.valid || !userId || !pack || !packId) {
    logEvent('warn', 'stripe_checkout_metadata_rejected', { sessionId: session.id, packId });
    return res.json({ received: true });
  }

  try {
    const granted = await observe('stripe.webhook.recordPayment', () => recordGenerationPayment({
      userId,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      credits: pack.credits,
      amountCents,
      currency: 'usd',
    }), 1000);
    logEvent('info', 'stripe_checkout_recorded', { sessionId: session.id, packId, credits: pack.credits, granted });
    return res.json({ received: true });
  } catch (error) {
    // Return 500 so Stripe retries. The database RPC is idempotent by stripe_session_id.
    recordError(error, 'stripe_checkout_record_failed', { sessionId: session.id, packId });
    return res.status(500).send('Could not record payment.');
  }
}

export function handleCreditPacks(_req: Request, res: Response) {
  return res.json(Object.entries(CREDIT_PACKS).map(([id, pack]) => ({ id, ...pack })));
}

export async function handleCreateCheckout(req: AuthedRequest, res: Response) {
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured yet.' });

  const packId = String(req.body?.packId || '') as CreditPackId;
  const pack = CREDIT_PACKS[packId];
  if (!pack) return res.status(400).json({ error: 'Unknown credit pack.' });

  try {
    const session = await observe('stripe.checkout.create', () => stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: req.authUser?.email || undefined,
      client_reference_id: req.authUser!.id,
      success_url: `${APP_URL}/#/generator?purchase=success`,
      cancel_url: `${APP_URL}/#/generator?purchase=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        user_id: req.authUser!.id,
        credits: String(pack.credits),
        pack_id: packId,
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: pack.cents,
          product_data: {
            name: pack.label,
            description: 'Generation credits for Shinobi Identity Archive.',
          },
        },
      }],
    }, {
      // Prevent a repeated browser submission from creating multiple checkout sessions.
      idempotencyKey: `checkout:${req.authUser!.id}:${packId}:${Math.floor(Date.now()/30_000)}`,
    }), 2000);

    if (!session.url) return res.status(502).json({ error: 'Stripe did not return a checkout URL.' });
    logEvent('info', 'stripe_checkout_created', { requestId: req.requestId, sessionId: session.id, packId });
    return res.json({ url: session.url });
  } catch (error) {
    recordError(error, 'stripe_checkout_create_failed', { requestId: req.requestId, packId });
    return res.status(500).json({ error: 'Could not start checkout.' });
  }
}
