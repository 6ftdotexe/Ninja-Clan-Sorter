import type { Response } from 'express';
import {
  OPENAI_IMAGE_MODEL,
  type AuthedRequest,
  type GenerationQuality,
  type PortraitMode,
  admin,
  getCredits,
  grantCredits,
  requireAdmin,
  reserveCredits,
} from './config.js';
import { logEvent, observe, recordError } from './diagnostics.js';

type OpenAIImagePayload = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

const OPENAI_TIMEOUT_MS = 110_000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_REFERENCE_BYTES = 10_000_000;
const MAX_GENERATED_BYTES = 20_000_000;
const MAX_PROFILE_PROMPT = 7000;
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg','image/png','image/webp']);

export function generationCost(quality: GenerationQuality) {
  return quality === 'high' ? 2 : 1;
}

export function asPortraitMode(value: unknown): PortraitMode {
  return value === 'portrait' || value === 'action' || value === 'dossier' || value === 'full-body'
    ? value
    : 'full-body';
}

export function asGenerationQuality(value: unknown): GenerationQuality {
  return value === 'high' ? 'high' : 'medium';
}

export function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match || !ALLOWED_IMAGE_MIME.has(match[1])) return null;
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_REFERENCE_BYTES) return null;
  return { mime: match[1], bytes };
}


export function sanitizeProfilePrompt(value: unknown) {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (clean.length < 40 || clean.length > MAX_PROFILE_PROMPT) return null;
  return clean;
}

export function openAIImageSize(mode: PortraitMode): '1024x1024' | '1024x1536' | '1536x1024' {
  if (mode === 'action') return '1536x1024';
  if (mode === 'portrait') return '1024x1024';
  return '1024x1536';
}

export function buildOpenAIImagePrompt(profilePrompt: string, mode: PortraitMode) {
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

async function createGeneration(userId: string, mode: PortraitMode, quality: GenerationQuality, credits: number) {
  const client = requireAdmin();
  const { data, error } = await observe('supabase.generation.create', () => client
    .from('generations')
    .insert({
      user_id: userId,
      status: 'processing',
      credits_used: credits,
      model: OPENAI_IMAGE_MODEL,
      mode,
      quality,
    })
    .select('id')
    .single(), 1000);
  if (error) throw error;
  return String(data.id);
}

async function finishGeneration(generationId: string, status: 'completed' | 'failed', errorMessage?: string) {
  const client = requireAdmin();
  const payload = {
    status,
    completed_at: new Date().toISOString(),
    ...(errorMessage ? { error_message: errorMessage.slice(0, 500) } : {}),
  };
  const { error } = await observe('supabase.generation.finish', () => client.from('generations').update(payload).eq('id', generationId), 1000);
  if (error) recordError(error, 'generation_finish_failed', { generationId, status });
}

async function requestOpenAIImage(photoDataUrl: string, prompt: string, mode: PortraitMode, quality: GenerationQuality) {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openAiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const parsed = parseDataUrl(photoDataUrl);
  if (!parsed) throw new Error('Reference photo encoding is invalid.');

  const form = new FormData();
  form.append('model', OPENAI_IMAGE_MODEL);
  form.append(
    'image',
    new Blob([new Uint8Array(parsed.bytes)], { type: parsed.mime }),
    `reference.${parsed.mime.includes('png') ? 'png' : 'jpg'}`,
  );
  form.append('prompt', buildOpenAIImagePrompt(prompt, mode));
  form.append('size', openAIImageSize(mode));
  form.append('quality', quality);
  form.append('input_fidelity', 'high');

  const response = await observe('openai.image.edit', () => fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form,
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
  }), 30_000);

  const payload = (await response.json().catch(() => null)) as OpenAIImagePayload | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI image generation failed (${response.status}).`);
  }

  const item = payload?.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (!item?.url) throw new Error('OpenAI returned no generated image.');

  const imageResponse = await observe('openai.image.download', () => fetch(item.url!, { signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS) }), 5000);
  if (!imageResponse.ok) throw new Error('OpenAI generated the image but it could not be downloaded.');
  const mime = (imageResponse.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(mime)) throw new Error('Generated image had an unexpected content type.');
  const contentLength = Number(imageResponse.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_GENERATED_BYTES) throw new Error('Generated image exceeded the allowed size.');
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_GENERATED_BYTES) throw new Error('Generated image exceeded the allowed size.');
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

export async function handleCredits(req: AuthedRequest, res: Response) {
  try {
    return res.json({ credits: await getCredits(req.authUser!.id) });
  } catch (error) {
    recordError(error, 'credit_lookup_failed', { requestId: req.requestId });
    return res.status(500).json({ error: 'Could not load generation credits.' });
  }
}

export async function handleGenerateShinobi(req: AuthedRequest, res: Response) {
  if (!admin) return res.status(503).json({ error: 'Supabase server credentials are not configured.' });
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return res.status(503).json({ error: 'OPENAI_API_KEY is not configured.' });
  }

  const { photoDataUrl } = req.body ?? {};
  const prompt = sanitizeProfilePrompt(req.body?.prompt);
  const mode = asPortraitMode(req.body?.mode);
  const quality = asGenerationQuality(req.body?.quality);
  const cost = generationCost(quality);

  if (typeof photoDataUrl !== 'string' || !photoDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'A valid reference photo is required.' });
  }
  if (photoDataUrl.length > 14_000_000) return res.status(413).json({ error: 'Reference image is too large.' });
  if (!prompt) return res.status(400).json({ error: 'Invalid generation prompt.' });

  const userId = req.authUser!.id;
  let generationId: string | null = null;
  let creditsReserved = false;

  try {
    const remaining = await reserveCredits(userId, cost);
    if (remaining < 0) {
      return res.status(402).json({
        error: `You need ${cost} generation credit${cost === 1 ? '' : 's'} for this render.`,
        code: 'INSUFFICIENT_CREDITS',
        requiredCredits: cost,
        credits: await getCredits(userId),
      });
    }

    creditsReserved = true;
    generationId = await createGeneration(userId, mode, quality, cost);
    logEvent('info', 'generation_started', { requestId: req.requestId, generationId, mode, quality, credits: cost });
    const imageDataUrl = await requestOpenAIImage(photoDataUrl, prompt, mode, quality);
    await finishGeneration(generationId, 'completed');
    logEvent('info', 'generation_completed', { requestId: req.requestId, generationId, mode, quality, credits: cost });

    return res.json({
      imageDataUrl,
      provider: 'openai',
      model: OPENAI_IMAGE_MODEL,
      creditsUsed: cost,
      creditsRemaining: remaining,
      generationId,
    });
  } catch (error) {
    recordError(error, 'generation_failed', { requestId: req.requestId, generationId, mode, quality, credits: cost });
    const timedOut = error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError');
    const message = timedOut ? 'Image generation timed out. Your reserved credits are being restored.' : error instanceof Error ? error.message : 'Image generation failed.';
    let creditsRefunded = false;

    if (creditsReserved) {
      try {
        await grantCredits(userId, cost);
        creditsRefunded = true;
      } catch (refundError) {
        recordError(refundError, 'generation_refund_failed', { requestId: req.requestId, generationId, credits: cost });
      }
    }

    if (generationId) await finishGeneration(generationId, 'failed', message);
    const dbCode = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code || '') : '';
    const concurrent = dbCode === '23505' && !generationId;
    return res.status(concurrent ? 409 : timedOut ? 504 : 500).json({
      error: concurrent
        ? 'A generation is already in progress for this account. Wait for it to finish before starting another.'
        : creditsReserved && !creditsRefunded
          ? `${message} Credit restoration is delayed; please contact support if your balance does not recover.`
          : message,
      creditsRefunded,
    });
  }
}
