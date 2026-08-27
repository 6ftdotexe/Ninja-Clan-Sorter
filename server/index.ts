import 'dotenv/config';
import express, { type Request } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

type PortraitMode = 'portrait' | 'full-body' | 'action' | 'dossier';
type GenerationQuality = 'medium' | 'high';

type AuthedRequest = Request & {
  authUser?: { id: string; email?: string | null };
};

const app = express();

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const admin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-2';
const APP_URL = (process.env.APP_URL?.trim() || 'http://localhost:5173').replace(/\/$/, '');

const CREDIT_PACKS = {
  single: { credits: 1, cents: 199, label: '1 Shinobi Generation Credit' },
  triple: { credits: 3, cents: 499, label: '3 Shinobi Generation Credits' },
  ten: { credits: 10, cents: 1299, label: '10 Shinobi Generation Credits' },
} as const;

function generationCost(quality: GenerationQuality) {
  return quality === 'high' ? 2 : 1;
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], bytes: Buffer.from(match[2], 'base64') };
}

function openAIImageSize(mode: PortraitMode): '1024x1024' | '1024x1536' | '1536x1024' {
  if (mode === 'action') return '1536x1024';
  if (mode === 'portrait') return '1024x1024';
  return '1024x1536';
}

function buildOpenAIImagePrompt(profilePrompt: string, mode: PortraitMode) {
  const composition =
    mode === 'portrait'
      ? 'cinematic head-and-shoulders or waist-up portrait'
      : mode === 'action'
        ? 'wide cinematic full-body action composition with environmental depth'
        : mode === 'dossier'
          ? 'clean vertical full-body character-sheet composition suitable for a dossier'
          : 'vertical full-body character illustration with the entire outfit visible';

  return `
Transform the adult person in the supplied reference photo into an ORIGINAL anime shinobi character.

IDENTITY PRESERVATION — HIGHEST PRIORITY
Preserve the recognizable identity of the person in the reference image: facial structure, skin tone, eye shape, nose, mouth, jawline, facial hair when present, hairstyle, hair texture, and overall age/presentation. The output should clearly look like the same adult person, stylized as anime rather than replaced by a different person.

COMPOSITION
${composition}.

SHINOBI PROFILE
${profilePrompt}

VISUAL DIRECTION
Create premium modern shonen ninja anime key art: crisp expressive linework, detailed cel shading, cinematic lighting, realistic anime anatomy, layered practical shinobi clothing, wraps, tactical fabric, arm guards, utility pouches, scroll/equipment details, and an original forehead protector or village emblem when appropriate. Make the village, terrain, climate, chakra effects, summon, rank presence, and inherited traits dynamically match ONLY the supplied profile.

CHAKRA AND SUMMONING
Show only chakra natures actually listed in the profile. Keep elemental effects controlled and readable. Include a summoning companion only when the profile includes one. Keep the human character as the primary focal point.

ORIGINAL CHARACTER REQUIREMENT
Do not copy or closely recreate any named canon anime character, recognizable canon costume, exact clan symbol, exact eye pattern, signature hairstyle, signature pose, or franchise logo. If an inherited eye ability is relevant, invent a new iris design rather than reproducing a recognizable canon design.

CONTENT
Adult character. Non-graphic fantasy action. No blood, gore, wounds, corpses, torture, graphic injury, or horror. Shinobi tools may be present as neutral costume/equipment details. No text, watermark, UI, or logos.

QUALITY TARGET
Highly polished character illustration, detailed face and eyes, coherent hands and anatomy, readable silhouette, cinematic hidden-village worldbuilding, and strong resemblance to the reference person.
`.trim();
}

async function requireUser(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  if (!admin) {
    return res.status(503).json({ error: 'Server Supabase credentials are not configured.' });
  }
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Your session is invalid or expired.' });
  req.authUser = { id: data.user.id, email: data.user.email };
  next();
}

async function getCredits(userId: string) {
  if (!admin) return 0;
  const { data, error } = await admin
    .from('generation_wallets')
    .select('credits')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.credits || 0);
}

async function reserveCredits(userId: string, amount: number) {
  if (!admin) throw new Error('Supabase admin client is unavailable.');
  const { data, error } = await admin.rpc('reserve_generation_credits', {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) throw error;
  return Number(data);
}

async function grantCredits(userId: string, amount: number) {
  if (!admin) throw new Error('Supabase admin client is unavailable.');
  const { data, error } = await admin.rpc('grant_generation_credits', {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) throw error;
  return Number(data);
}

// Stripe requires the raw request body for webhook signature verification.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !stripeWebhookSecret || !admin) {
    return res.status(503).send('Stripe webhook is not configured.');
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') return res.status(400).send('Missing Stripe signature.');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature error:', error);
    return res.status(400).send('Invalid webhook signature.');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = Number(session.metadata?.credits || 0);

    if (userId && credits > 0 && session.payment_status === 'paid') {
      const { error: insertError } = await admin.from('generation_payments').insert({
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        credits,
        amount_cents: session.amount_total || 0,
        currency: session.currency || 'usd',
        status: 'paid',
      });

      if (!insertError) {
        await grantCredits(userId, credits);
        console.log(`Granted ${credits} generation credit(s) to ${userId}.`);
      } else if (insertError.code !== '23505') {
        console.error('Could not record completed checkout:', insertError);
        return res.status(500).send('Could not record payment.');
      }
    }
  }

  return res.json({ received: true });
});

app.use(express.json({ limit: '14mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'shinobi-v9-phase3',
    imageProvider: 'openai',
    imageModel: OPENAI_IMAGE_MODEL,
    paymentsConfigured: Boolean(stripe && stripeWebhookSecret),
    accountsConfigured: Boolean(admin),
  });
});

app.get('/api/credits', requireUser, async (req: AuthedRequest, res) => {
  try {
    const credits = await getCredits(req.authUser!.id);
    return res.json({ credits });
  } catch (error) {
    console.error('Credit lookup failed:', error);
    return res.status(500).json({ error: 'Could not load generation credits.' });
  }
});

app.get('/api/credit-packs', (_req, res) => {
  return res.json(
    Object.entries(CREDIT_PACKS).map(([id, pack]) => ({ id, ...pack }))
  );
});

app.post('/api/create-checkout', requireUser, async (req: AuthedRequest, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured yet.' });

  const packId = String(req.body?.packId || '') as keyof typeof CREDIT_PACKS;
  const pack = CREDIT_PACKS[packId];
  if (!pack) return res.status(400).json({ error: 'Unknown credit pack.' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: req.authUser?.email || undefined,
      client_reference_id: req.authUser!.id,
      success_url: `${APP_URL}/generator?purchase=success`,
      cancel_url: `${APP_URL}/generator?purchase=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        user_id: req.authUser!.id,
        credits: String(pack.credits),
        pack_id: packId,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: pack.cents,
            product_data: {
              name: pack.label,
              description: 'Generation credits for Shinobi Identity Archive.',
            },
          },
        },
      ],
    });

    if (!session.url) return res.status(502).json({ error: 'Stripe did not return a checkout URL.' });
    return res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout creation failed:', error);
    return res.status(500).json({ error: 'Could not start checkout.' });
  }
});

app.post('/api/generate-shinobi', requireUser, async (req: AuthedRequest, res) => {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openAiKey) return res.status(503).json({ error: 'OPENAI_API_KEY is not configured.' });
  if (!admin) return res.status(503).json({ error: 'Supabase server credentials are not configured.' });

  const { photoDataUrl, prompt, mode = 'full-body', quality = 'medium' } = req.body ?? {};
  const portraitMode = mode as PortraitMode;
  const generationQuality: GenerationQuality = quality === 'high' ? 'high' : 'medium';
  const cost = generationCost(generationQuality);

  if (typeof photoDataUrl !== 'string' || !photoDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'A valid reference photo is required.' });
  }
  if (photoDataUrl.length > 14_000_000) {
    return res.status(413).json({ error: 'Reference image is too large.' });
  }
  if (typeof prompt !== 'string' || prompt.length < 40 || prompt.length > 9000) {
    return res.status(400).json({ error: 'Invalid generation prompt.' });
  }

  const parsed = parseDataUrl(photoDataUrl);
  if (!parsed) return res.status(400).json({ error: 'Reference photo encoding is invalid.' });

  let generationId: string | null = null;
  let creditsReserved = false;

  try {
    const remaining = await reserveCredits(req.authUser!.id, cost);
    if (remaining < 0) {
      return res.status(402).json({
        error: `You need ${cost} generation credit${cost === 1 ? '' : 's'} for this render.`,
        code: 'INSUFFICIENT_CREDITS',
        requiredCredits: cost,
        credits: await getCredits(req.authUser!.id),
      });
    }
    creditsReserved = true;

    const { data: generation, error: generationInsertError } = await admin
      .from('generations')
      .insert({
        user_id: req.authUser!.id,
        status: 'processing',
        credits_used: cost,
        model: OPENAI_IMAGE_MODEL,
        mode: portraitMode,
        quality: generationQuality,
      })
      .select('id')
      .single();

    if (generationInsertError) throw generationInsertError;
    generationId = generation.id;

    const form = new FormData();
    form.append('model', OPENAI_IMAGE_MODEL);
    form.append('image', new Blob([new Uint8Array(parsed.bytes)], { type: parsed.mime }), `reference.${parsed.mime.includes('png') ? 'png' : 'jpg'}`);
    form.append('prompt', buildOpenAIImagePrompt(prompt, portraitMode));
    form.append('size', openAIImageSize(portraitMode));
    form.append('quality', generationQuality);
    form.append('input_fidelity', 'high');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: form,
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: Array<{ b64_json?: string; url?: string }>; error?: { message?: string } }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error?.message || `OpenAI image generation failed (${response.status}).`);
    }

    const item = payload?.data?.[0];
    let imageDataUrl = '';
    if (item?.b64_json) {
      imageDataUrl = `data:image/png;base64,${item.b64_json}`;
    } else if (item?.url) {
      const imageResponse = await fetch(item.url);
      if (!imageResponse.ok) throw new Error('OpenAI generated the image but it could not be downloaded.');
      const bytes = Buffer.from(await imageResponse.arrayBuffer());
      const mime = imageResponse.headers.get('content-type') || 'image/png';
      imageDataUrl = `data:${mime};base64,${bytes.toString('base64')}`;
    }

    if (!imageDataUrl) throw new Error('OpenAI returned no generated image.');

    await admin
      .from('generations')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', generationId);

    return res.json({
      imageDataUrl,
      provider: 'openai',
      model: OPENAI_IMAGE_MODEL,
      creditsUsed: cost,
      creditsRemaining: remaining,
      generationId,
    });
  } catch (error) {
    console.error('OpenAI generation failed:', error);

    if (creditsReserved) {
      try {
        await grantCredits(req.authUser!.id, cost);
      } catch (refundError) {
        console.error('CRITICAL: generation credit refund failed:', refundError);
      }
    }

    if (generationId) {
      await admin
        .from('generations')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message.slice(0, 500) : 'Unknown generation failure',
          completed_at: new Date().toISOString(),
        })
        .eq('id', generationId);
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Image generation failed.',
      creditsRefunded: creditsReserved,
    });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(dist));
  app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Shinobi V9 Phase 3 listening on http://localhost:${port}`);
  console.log(`Image model: ${OPENAI_IMAGE_MODEL}`);
  console.log(`Stripe configured: ${Boolean(stripe && stripeWebhookSecret)}`);
});
