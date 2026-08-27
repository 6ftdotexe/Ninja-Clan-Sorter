import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type PortraitMode = 'portrait' | 'full-body' | 'action' | 'dossier';

const app = express();
app.use(express.json({ limit: '12mb' }));

function getCanvas(mode: PortraitMode) {
  if (mode === 'action') return { width: 1152, height: 768 };
  if (mode === 'full-body') return { width: 768, height: 1152 };
  if (mode === 'dossier') return { width: 768, height: 1152 };
  return { width: 768, height: 1152 };
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload;

  if (payload && typeof payload === 'object') {
    const data = payload as {
      errors?: Array<{ message?: string }>;
      error?: string;
      message?: string;
      result?: unknown;
    };

    if (Array.isArray(data.errors) && data.errors[0]?.message) {
      return data.errors[0].message;
    }
    if (typeof data.error === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;

    if (data.result && typeof data.result === 'object') {
      const nested = data.result as { error?: string; message?: string };
      if (typeof nested.error === 'string') return nested.error;
      if (typeof nested.message === 'string') return nested.message;
    }
  }

  return fallback;
}

async function parseCloudflareError(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  try {
    return contentType.includes('application/json')
      ? await response.json()
      : await response.text();
  } catch {
    return null;
  }
}

function extractVisionText(payload: unknown): string {
  if (!payload) return '';
  if (typeof payload === 'string') return payload.trim();
  if (typeof payload !== 'object') return '';

  const data = payload as {
    response?: unknown;
    output?: unknown;
    result?: unknown;
  };

  // Direct Workers/binding-shaped response.
  if (typeof data.response === 'string' && data.response.trim()) {
    return data.response.trim();
  }
  if (typeof data.output === 'string' && data.output.trim()) {
    return data.output.trim();
  }
  if (typeof data.result === 'string' && data.result.trim()) {
    return data.result.trim();
  }

  // Cloudflare REST API commonly wraps the model output in `result`.
  if (data.result && typeof data.result === 'object') {
    const result = data.result as {
      response?: unknown;
      output?: unknown;
      result?: unknown;
      text?: unknown;
    };

    if (typeof result.response === 'string' && result.response.trim()) {
      return result.response.trim();
    }
    if (typeof result.output === 'string' && result.output.trim()) {
      return result.output.trim();
    }
    if (typeof result.result === 'string' && result.result.trim()) {
      return result.result.trim();
    }
    if (typeof result.text === 'string' && result.text.trim()) {
      return result.text.trim();
    }
  }

  return '';
}

function sanitizePromptForCloudflare(input: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\bassault\b/gi, 'front-line'],
    [/\bprecision offense\b/gi, 'precision technique'],
    [/\boffense\b/gi, 'technique style'],
    [/\bbattlefield\b/gi, 'shinobi environment'],
    [/\bweapon\b/gi, 'shinobi tool'],
    [/\bweapons\b/gi, 'shinobi tools'],
    [/\bdangerous\b/gi, 'elite'],
    [/\bintimidating\b/gi, 'commanding'],
    [/\baggressive\b/gi, 'assertive'],
    [/\bviolent\b/gi, 'intense'],
    [/\blethal\b/gi, 'highly precise'],
    [/\bdeadly\b/gi, 'highly skilled'],
    [/\bkill\b/gi, 'defeat'],
    [/\bkilling\b/gi, 'overcoming opponents'],
    [/\bdeath\b/gi, 'serious stakes'],
  ];

  let safe = input;
  for (const [pattern, replacement] of replacements) {
    safe = safe.replace(pattern, replacement);
  }
  return safe;
}

function isFlaggedOutputError(payload: unknown): boolean {
  const message = getErrorMessage(payload, '').toLowerCase();
  return (
    message.includes('flagged') ||
    message.includes('choose another prompt') ||
    message.includes('safety') ||
    message.includes('moderation') ||
    message.includes('policy')
  );
}

async function describeReferencePhoto(args: {
  accountId: string;
  apiToken: string;
  visionModel: string;
  photoDataUrl: string;
}): Promise<string> {
  const { accountId, apiToken, visionModel, photoDataUrl } = args;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${visionModel}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'Describe visible physical appearance for an original anime character-art prompt. Do not identify the person. Be concise and neutral.',
          },
          {
            role: 'user',
            content: [
              'Describe only the visible appearance of the adult person in this photo.',
              'Include approximate adult age range, skin tone, face shape, visible eye color and shape, eyebrows, hair color, length, texture and hairstyle, facial hair if any, visible build/frame, and overall expression.',
              'Do not identify the person. Do not compare them to celebrities or fictional characters.',
              'Return one compact paragraph under 90 words.',
            ].join(' '),
          },
        ],
        image: photoDataUrl,
        max_tokens: 180,
        temperature: 0.2,
      }),
    }
  );

  if (!response.ok) {
    const errorPayload = await parseCloudflareError(response);
    throw new Error(
      `Vision analysis failed: ${getErrorMessage(
        errorPayload,
        'Cloudflare vision request failed.'
      )}`
    );
  }

  const payload = await response.json().catch(() => null);

  // Keep this log while testing. It contains the model response, not your API token.
  console.log('VISION RAW RESPONSE:', JSON.stringify(payload, null, 2));

  const description = extractVisionText(payload);
  if (!description) {
    throw new Error(
      'Vision model returned no usable appearance description. Check the server console for VISION RAW RESPONSE.'
    );
  }

  return description;
}

function buildImagePrompt(
  appearanceDescription: string,
  shinobiPrompt: string
): string {
  return `
Create polished high-detail 2D anime character concept art of an ORIGINAL adult shinobi.

HUMAN APPEARANCE BASIS
${appearanceDescription}

SHINOBI IDENTITY
${shinobiPrompt}

VISUAL LANGUAGE
Make the result unmistakably a hidden-ninja-village shonen anime character while remaining original: layered shinobi clothing, practical tactical vest or light armor when appropriate, cloth wraps, arm guards, utility pouches, scroll details, open-toed shinobi footwear when visible, and an original forehead protector with an invented emblem. Use a strong readable silhouette, expressive anime eyes, cel-shaded forms, crisp linework, cinematic anime lighting and detailed fabric folds.

DYNAMIC PROFILE ADAPTATION
Use ONLY the profile supplied above. Let its clan/bloodline influence motifs and inherited features. Let its village influence terrain, architecture, climate, palette and clothing practicality. Show only the listed chakra nature or natures as controlled aura/effects. Include a summoning companion only if one is present in the profile. If an inherited eye trait is present, create a subtle original iris design rather than a recognizable canon pattern. Use mentor/shadow results only as personality, posture and composure influences—not physical resemblance.

ORIGINALITY
Do not copy or closely recreate any named anime character, recognizable canon costume, insignia, hairstyle, pose, eye pattern or signature item. No franchise logos or text.

CONTENT
Adult character. Non-graphic fantasy action atmosphere. No blood, gore, wounds, corpses, torture or graphic violence. Any shinobi tools should be sheathed, holstered or secondary to the character design.

OUTPUT
Professional anime key art, coherent anatomy, clean hands, detailed face, sharp eyes, no text, no watermark.
`.trim();
}

async function parseCloudflareImageResponse(
  response: Response
): Promise<{ imageDataUrl: string } | null> {
  const contentType = response.headers.get('content-type') || '';

  if (
    contentType.startsWith('image/') ||
    contentType.includes('application/octet-stream')
  ) {
    const bytes = Buffer.from(await response.arrayBuffer());
    const mime = contentType.startsWith('image/') ? contentType : 'image/png';
    return { imageDataUrl: `data:${mime};base64,${bytes.toString('base64')}` };
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        image?: string;
        mime_type?: string;
        result?: unknown;
      }
    | null;

  if (!payload) return null;

  if (typeof payload.image === 'string') {
    return {
      imageDataUrl: `data:${payload.mime_type || 'image/png'};base64,${payload.image}`,
    };
  }

  if (payload.result && typeof payload.result === 'object') {
    const result = payload.result as {
      image?: string;
      mime_type?: string;
    };
    if (typeof result.image === 'string') {
      return {
        imageDataUrl: `data:${result.mime_type || 'image/png'};base64,${result.image}`,
      };
    }
  }

  return null;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'shinobi-v9-image-generator',
    provider: 'cloudflare-workers-ai',
    visionModel:
      process.env.CLOUDFLARE_VISION_MODEL ||
      '@cf/meta/llama-3.2-11b-vision-instruct',
    imageModel:
      process.env.CLOUDFLARE_AI_MODEL || '@cf/lykon/dreamshaper-8-lcm',
  });
});

app.post('/api/generate-shinobi', async (req, res) => {
  try {
    const { photoDataUrl, prompt, mode, quality } = req.body ?? {};

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const visionModel =
      process.env.CLOUDFLARE_VISION_MODEL ||
      '@cf/meta/llama-3.2-11b-vision-instruct';
    const imageModel =
      process.env.CLOUDFLARE_AI_MODEL || '@cf/lykon/dreamshaper-8-lcm';

    if (!accountId || !apiToken) {
      return res.status(503).json({
        error:
          'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in .env.',
      });
    }

    if (
      typeof photoDataUrl !== 'string' ||
      !photoDataUrl.startsWith('data:image/')
    ) {
      return res.status(400).json({ error: 'A valid reference photo is required.' });
    }

    if (photoDataUrl.length > 12_000_000) {
      return res.status(413).json({ error: 'Reference image is too large.' });
    }

    if (
      typeof prompt !== 'string' ||
      prompt.length < 40 ||
      prompt.length > 7000
    ) {
      return res.status(400).json({ error: 'Invalid generation prompt.' });
    }

    const { width, height } = getCanvas(
      (mode as PortraitMode) || 'portrait'
    );

    console.log(`Analyzing reference photo with ${visionModel}...`);
    const appearanceDescription = await describeReferencePhoto({
      accountId,
      apiToken,
      visionModel,
      photoDataUrl,
    });
    console.log('APPEARANCE DESCRIPTION:', appearanceDescription);

    const runGeneration = async (profilePrompt: string) => {
      const finalPrompt = buildImagePrompt(appearanceDescription, profilePrompt);
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${imageModel}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: finalPrompt,
            width,
            height,
            num_steps: quality === 'medium' ? 16 : 20,
            guidance: quality === 'medium' ? 6.5 : 7.5,
            negative_prompt:
              'photograph, photorealistic, 3d render, blurry, low detail, distorted anatomy, extra fingers, extra limbs, duplicate face, malformed eyes, cropped face, text, logo, watermark, blood, gore, wound, horror',
            seed: Math.floor(Math.random() * 1_000_000_000),
          }),
        }
      );

      if (!response.ok) {
        const errorPayload = await parseCloudflareError(response);
        return {
          ok: false as const,
          status: response.status,
          errorPayload,
          errorMessage: getErrorMessage(
            errorPayload,
            'Cloudflare image generation failed.'
          ),
        };
      }

      const parsed = await parseCloudflareImageResponse(response);
      if (!parsed) {
        return {
          ok: false as const,
          status: 502,
          errorPayload: null,
          errorMessage:
            'Cloudflare completed the image request but returned no usable image.',
        };
      }

      return {
        ok: true as const,
        body: {
          imageDataUrl: parsed.imageDataUrl,
          requestId: response.headers.get('cf-ray') || undefined,
          provider: 'cloudflare-workers-ai',
          model: imageModel,
          appearanceDescription,
        },
      };
    };

    console.log(`Generating with ${imageModel}...`);
    console.log(`Mode: ${mode || 'portrait'} | ${width}x${height}`);

    const first = await runGeneration(prompt);
    if (first.ok) {
      return res.json({ ...first.body, moderatedRetry: false });
    }

    if (isFlaggedOutputError(first.errorPayload)) {
      console.warn('Generation flagged. Retrying with safer profile wording...');
      const retry = await runGeneration(sanitizePromptForCloudflare(prompt));
      if (retry.ok) {
        return res.json({ ...retry.body, moderatedRetry: true });
      }
      return res.status(retry.status).json({
        error: retry.errorMessage,
        safetyRetryAttempted: true,
      });
    }

    return res.status(first.status).json({ error: first.errorMessage });
  } catch (error) {
    console.error('Unhandled generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Image generation failed.',
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
  console.log(`Shinobi V9 server listening on http://localhost:${port}`);
  console.log(
    `Vision model: ${
      process.env.CLOUDFLARE_VISION_MODEL ||
      '@cf/meta/llama-3.2-11b-vision-instruct'
    }`
  );
  console.log(
    `Image model: ${
      process.env.CLOUDFLARE_AI_MODEL || '@cf/lykon/dreamshaper-8-lcm'
    }`
  );
});
