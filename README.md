# Shinobi Identity Archive V8

V8 adds a photo-based AI shinobi generator to the modular React/TypeScript sorter from V7.

## What this updated V8 adds

- Upload a real user reference photo in the browser
- Build an image-generation brief automatically from the saved Clan, Village, Rank, Role, Chakra, Summon, Sensei, Shadow Mirror, leadership, inherited trait, and specialization results
- Portrait, full-body, action-scene, and dossier composition modes
- High-fidelity server-side reference-image generation
- Optional summon and inherited-eye details
- "Use as dossier portrait" stores the generated render in IndexedDB instead of localStorage
- Dossier export embeds the AI portrait
- V7/V6 profile migration into the V8 archive key
- **Cloudflare Workers AI** backend instead of OpenAI
- Updated to use `@cf/black-forest-labs/flux-2-klein-4b` for reference-image generation
- The uploaded photo is automatically resized to a Cloudflare-friendly reference size before generation

## Development

1. Copy `.env.example` to `.env`.
2. Add your Cloudflare account ID and API token.
3. Install dependencies.
4. Run the app and API together.

```bash
cp .env.example .env
npm install
npm run dev
```

Vite runs the React app and proxies `/api` to the local Express server.

## Production

```bash
npm run build
npm start
```

The Express server serves `dist/` when `NODE_ENV=production`.

## Environment variables

```text
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_AI_MODEL=@cf/black-forest-labs/flux-2-klein-4b
PORT=8787
```

Do not put `CLOUDFLARE_API_TOKEN` in any `VITE_*` variable. Anything prefixed with `VITE_` is client-visible.

## Generator flow

`GeneratorPage` optimizes the uploaded image to fit the reference-image limits, builds the prompt from the current archive, and POSTs both to `/api/generate-shinobi`. The server sends the prompt plus the uploaded reference image to the Cloudflare Workers AI REST API using a multipart-form request, then returns the generated image back to the browser.

The raw uploaded selfie is not persisted by the V8 frontend. When the user chooses **Use as dossier portrait**, only the generated image is saved into IndexedDB for local reuse.

- Image generation keeps Sensei and Shadow Mirror names in the app UI, but converts them to abstract personality/tactical traits before sending the image prompt; named-character visual imitation is intentionally avoided.
- This implementation favors **free / low-cost access** and reasonable likeness guidance.
