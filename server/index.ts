import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type PortraitMode = 'portrait' | 'full-body' | 'action' | 'dossier';

type VisualProfile = {
  subject: string;
  composition: string;
  clothing: string;
  environment: string;
  chakra: string;
  companion: string;
  style: string;
};

const app = express();

app.use(express.json({ limit: '12mb' }));

function getCanvas(mode: PortraitMode) {
  if (mode === 'action') {
    return {
      width: 1152,
      height: 768,
    };
  }

  if (mode === 'full-body') {
    return {
      width: 768,
      height: 1152,
    };
  }

  if (mode === 'dossier') {
    return {
      width: 768,
      height: 1152,
    };
  }

  return {
    width: 768,
    height: 1152,
  };
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const data = payload as {
      errors?: Array<{ message?: string }>;
      error?: string;
      message?: string;
      result?: { error?: string };
    };

    if (Array.isArray(data.errors) && data.errors[0]?.message) {
      return data.errors[0].message;
    }

    if (typeof data.error === 'string') {
      return data.error;
    }

    if (typeof data.message === 'string') {
      return data.message;
    }

    if (typeof data.result?.error === 'string') {
      return data.result.error;
    }
  }

  return fallback;
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

async function parseCloudflareError(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch {
    return null;
  }
}

async function parseCloudflareImageResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (
    contentType.startsWith('image/') ||
    contentType.includes('application/octet-stream')
  ) {
    const arrayBuffer = await response.arrayBuffer();
    const mime = contentType.startsWith('image/') ? contentType : 'image/png';
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      imageDataUrl: `data:${mime};base64,${base64}`,
    };
  }

  const data = (await response.json().catch(() => null)) as
    | {
        result?: {
          image?: string;
          mime_type?: string;
        };
        image?: string;
        mime_type?: string;
      }
    | null;

  const imageBase64 = data?.result?.image || data?.image;
  const mime = data?.result?.mime_type || data?.mime_type || 'image/png';

  if (!imageBase64) {
    return null;
  }

  return {
    imageDataUrl: `data:${mime};base64,${imageBase64}`,
  };
}

function extractVisionText(payload: unknown): string {
  if (!payload) return '';

  const findString = (value: unknown): string => {
    if (!value) return '';

    if (typeof value === 'string') {
      return value.trim();
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findString(item);
        if (found) return found;
      }

      return '';
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;

      const preferredKeys = [
        'response',
        'result',
        'output_text',
        'output',
        'text',
        'content',
        'message',
      ];

      for (const key of preferredKeys) {
        if (key in obj) {
          const found = findString(obj[key]);

          if (found) {
            return found;
          }
        }
      }

      for (const value of Object.values(obj)) {
        const found = findString(value);

        if (found) {
          return found;
        }
      }
    }

    return '';
  };

  return findString(payload);
}

function stripCodeFences(input: string): string {
  return input
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseVisualProfile(text: string): VisualProfile {
  const cleaned = stripCodeFences(text);

  try {
    const parsed = JSON.parse(cleaned) as Partial<VisualProfile>;

    return {
      subject: String(parsed.subject || '').trim(),
      composition: String(parsed.composition || '').trim(),
      clothing: String(parsed.clothing || '').trim(),
      environment: String(parsed.environment || '').trim(),
      chakra: String(parsed.chakra || '').trim(),
      companion: String(parsed.companion || '').trim(),
      style: String(parsed.style || '').trim(),
    };
  } catch {
    // fallback: treat whole response as subject and provide defaults
    return {
      subject: cleaned,
      composition:
        'full-body or three-quarter-body heroic character poster composition, centered main subject, readable silhouette',
      clothing:
        'layered shinobi clothing with tactical ninja details, wraps, straps, utility pouches, shinobi sandals',
      environment:
        'hidden-village or elemental anime environment that matches the profile',
      chakra:
        'subtle elemental chakra effects matching the shinobi profile',
      companion:
        'include a companion only if the profile clearly suggests one',
      style:
        'high-detail cinematic shonen anime illustration with modern polished linework',
    };
  }
}

async function describeReferencePhoto(args: {
  accountId: string;
  apiToken: string;
  visionModel: string;
  photoDataUrl: string;
}) {
  const { accountId, apiToken, visionModel, photoDataUrl } = args;

  const visionPayload = {
    messages: [
      {
        role: 'system',
        content:
          'You analyze a reference image of an adult person and return a compact JSON object for use in an anime character generation prompt.',
      },
      {
        role: 'user',
        content: `
Analyze the adult person in the attached image and return ONLY valid JSON.

Required JSON schema:
{
  "subject": "...",
  "composition": "...",
  "clothing": "...",
  "environment": "...",
  "chakra": "...",
  "companion": "...",
  "style": "..."
}

Rules:
- The person is an adult.
- Do not identify the person.
- Do not mention copyrighted character names.
- Do not output markdown.
- Do not include extra explanation.

Field guidance:
- subject: describe visible appearance only (age group, skin tone, face shape, eye color if visible, hair color, hair style, facial hair, build impression, overall presentation)
- composition: describe pose/framing/composition suggested by the image if any
- clothing: describe visible outfit and useful clothing cues
- environment: describe visible or implied environment if present; if none, infer a neutral cinematic environment
- chakra: suggest a neutral visual-effects placeholder phrase only, such as "subtle energy effects can be added around the subject"
- companion: describe any visible companion or say "no visible companion"
- style: describe the image's overall illustration/rendering style if applicable, otherwise suggest "polished cinematic anime key art"
        `.trim(),
      },
    ],
    image: photoDataUrl,
  };

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${visionModel}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(visionPayload),
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

const rawText = await response.text();

console.log('VISION RAW HTTP RESPONSE:');
console.log(rawText);

let payload: unknown = null;

try {
  payload = JSON.parse(rawText);
} catch {
  payload = rawText;
}

const description = extractVisionText(payload);

console.log('VISION EXTRACTED TEXT:');
console.log(description);

if (!description) {
  throw new Error(
    `Vision model returned no usable appearance description. Raw response: ${rawText.slice(
      0,
      500
    )}`
  );
}

  const visualProfile = parseVisualProfile(description);

  console.log('VISION PARSED PROFILE:', visualProfile);

  return visualProfile;
}

function sanitizePromptForCloudflare(input: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\bassault\b/gi, 'front-line'],
    [/\boffense\b/gi, 'combat style'],
    [/\bprecision offense\b/gi, 'precision combat'],
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
    [/\bcombat scene\b/gi, 'dynamic shinobi scene'],
  ];

  let safePrompt = input;

  for (const [pattern, replacement] of replacements) {
    safePrompt = safePrompt.replace(pattern, replacement);
  }

  return `
${safePrompt}

CONTENT SAFETY
The character is an adult.
Non-graphic fantasy action only.
No blood, gore, wounds, injury, corpses, torture, horror, or graphic violence.
If shinobi tools appear, keep them secondary and non-graphic.
No text, logos, or watermark.
`.trim();
}

function buildDreamShaperPrompt(args: {
  visual: VisualProfile;
  shinobiPrompt: string;
  mode: PortraitMode;
}) {
  const { visual, shinobiPrompt, mode } = args;

  const framing =
    mode === 'action'
      ? 'full-body dynamic heroic action composition'
      : mode === 'portrait'
      ? 'waist-up or chest-up heroic anime portrait'
      : 'full-body or three-quarter-body character poster composition';

  return `
Create a polished, high-detail, cinematic anime illustration of an ORIGINAL shinobi character.

HUMAN APPEARANCE BASIS
Use these appearance traits as the main identity anchor:
${visual.subject}

COMPOSITION
Target composition:
${framing}

Reference composition guidance:
${visual.composition}

CLOTHING / SILHOUETTE
Preserve or reinterpret these cues:
${visual.clothing}

The final outfit should clearly feel like elite hidden-village shinobi gear:
- layered shinobi clothing
- wraps, straps, arm guards, utility pouches
- tactical fabric layering
- shinobi sandals
- scarf / cloak / high collar when appropriate
- original clan-inspired motifs
- no copied trademarked symbols

ENVIRONMENT
Use an anime environment that matches the user's shinobi profile.
Reference environment guidance:
${visual.environment}

If the user's village implies a specific setting, prioritize that:
- desert village → sandstone, dust, canyon walls, sunlit ruins
- leaf village → trees, rooftops, training grounds, stone streets
- mist village → fog, water, cool tones, wet stone
- cloud village → cliffs, storm light, altitude, dramatic sky
- stone village → rocky terrain, heavy stone architecture

CHAKRA / EFFECTS
Use elegant anime-style elemental effects.
Reference effects guidance:
${visual.chakra}

These effects should support the profile, not overwhelm it.

COMPANION / SUMMON
Reference companion guidance:
${visual.companion}

If the user's summoning contract exists, include an original companion inspired by that animal type.
Keep the companion secondary to the person.

STYLE
Target style:
- high-detail modern shonen anime key art
- cinematic lighting
- crisp linework
- detailed fabric rendering
- readable silhouette
- strong face rendering
- original character design
- visually closer to elite shinobi concept art than abstract or flat graphic art

Additional style hint from reference analysis:
${visual.style}

SHINOBI PROFILE
Use the following profile information as design direction:
${shinobiPrompt}

IMPORTANT RULES
- Keep the character clearly ORIGINAL.
- Do not copy any named anime character.
- Do not copy exact costumes, clan symbols, logos, eye patterns, or forehead protectors from existing franchises.
- Preserve the person's broad appearance, hair direction, face shape, and presentation as much as possible.
- Keep the result strongly shinobi / hidden-village / ninja-anime inspired.
- The main subject must remain the focal point.
- No text, no logos, no watermark.
- Broad-audience safe, non-graphic fantasy action only.
`.trim();
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'shinobi-v8-image-generator',
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
    const imageModel =
      process.env.CLOUDFLARE_AI_MODEL || '@cf/lykon/dreamshaper-8-lcm';
    const visionModel =
      process.env.CLOUDFLARE_VISION_MODEL ||
      '@cf/meta/llama-3.2-11b-vision-instruct';

    if (!accountId || !apiToken) {
      return res.status(503).json({
        error: 'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in .env.',
      });
    }

    if (typeof photoDataUrl !== 'string' || !photoDataUrl.startsWith('data:image/')) {
      return res.status(400).json({
        error: 'A valid reference photo is required.',
      });
    }

    if (photoDataUrl.length > 12_000_000) {
      return res.status(413).json({
        error: 'Reference image is too large.',
      });
    }

    if (typeof prompt !== 'string' || prompt.length < 40 || prompt.length > 7000) {
      return res.status(400).json({
        error: 'Invalid generation prompt.',
      });
    }

    const portraitMode = (mode as PortraitMode) || 'portrait';
    const { width, height } = getCanvas(portraitMode);

    console.log(`Analyzing reference photo with ${visionModel}...`);

    const visual = await describeReferencePhoto({
      accountId,
      apiToken,
      visionModel,
      photoDataUrl,
    });

    const runGeneration = async (promptToUse: string) => {
      const payload = {
  prompt: promptToUse,

  width,
  height,

  num_steps:
    quality === 'medium'
      ? 16
      : 20,

  guidance:
    quality === 'medium'
      ? 7
      : 7.5,

  negative_prompt: [
    'blurry',
    'low detail',
    'low resolution',
    'flat vector style',
    'abstract graphic design',
    'posterized colors',
    'futuristic cyberpunk clothing',
    'sci-fi armor',
    'modern streetwear',
    'female presentation when reference is masculine',
    'male presentation when reference is feminine',
    'different hair color',
    'different facial hair',
    'duplicate face',
    'extra limbs',
    'extra fingers',
    'malformed hands',
    'malformed eyes',
    'cropped head',
    'cropped feet',
    'text',
    'logo',
    'watermark',
    'blood',
    'gore',
    'horror',
  ].join(', '),

  seed: Math.floor(
    Math.random() * 1_000_000_000
  ),
};

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${imageModel}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
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

      if (!parsed?.imageDataUrl) {
        return {
          ok: false as const,
          status: 502,
          errorPayload: null,
          errorMessage: 'Cloudflare completed the request but returned no image.',
        };
      }

      return {
        ok: true as const,
        body: {
          imageDataUrl: parsed.imageDataUrl,
          provider: 'cloudflare-workers-ai',
          model: imageModel,
          visualProfile: visual,
        },
      };
    };

    const fullPrompt = buildDreamShaperPrompt({
      visual,
      shinobiPrompt: prompt,
      mode: portraitMode,
    });

    console.log(`Generating shinobi with ${imageModel}...`);
    console.log(`Mode: ${portraitMode} | ${width}x${height}`);

    const firstAttempt = await runGeneration(fullPrompt);

    if (firstAttempt.ok) {
      return res.json({
        ...firstAttempt.body,
        moderatedRetry: false,
      });
    }

    if (isFlaggedOutputError(firstAttempt.errorPayload)) {
      console.warn('Generation flagged. Retrying with safer wording...');

      const safePrompt = buildDreamShaperPrompt({
        visual,
        shinobiPrompt: sanitizePromptForCloudflare(prompt),
        mode: portraitMode,
      });

      const retry = await runGeneration(safePrompt);

      if (retry.ok) {
        return res.json({
          ...retry.body,
          moderatedRetry: true,
        });
      }

      return res.status(retry.status).json({
        error: retry.errorMessage,
        safetyRetryAttempted: true,
      });
    }

    return res.status(firstAttempt.status).json({
      error: firstAttempt.errorMessage,
    });
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

  app.use((_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
}

const port = Number(process.env.PORT || 8787);

app.listen(port, () => {
  console.log(`Shinobi V8 server listening on http://localhost:${port}`);
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