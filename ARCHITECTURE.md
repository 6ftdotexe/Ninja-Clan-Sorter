# V9 Architecture

## Frontend

- `src/features/generator/buildPrompt.ts` — converts quiz/profile results into a visual identity prompt.
- `src/pages/GeneratorPage.tsx` — photo upload, browser-side photo optimization, visual options, generation state, result actions.
- `src/services/imageGeneration.ts` — typed client call to the server endpoint.
- `src/services/portraitDb.ts` — IndexedDB persistence for the selected generated dossier portrait.
- `src/components/Dossier.tsx` — loads the selected portrait and includes it in the exported dossier PNG.

## Backend

- `server/index.ts` — Express server and `/api/generate-shinobi` endpoint.
- API credentials stay server-side.
- Reference image is sent to **Cloudflare Workers AI** using the REST API.
- The default model is `@cf/black-forest-labs/flux-2-klein-4b`.
- The backend uses `multipart/form-data` and attaches the reference image as `input_image_0`.
- The generated image is returned to the frontend as a data URL.

## Data separation

The six personality tests remain data-driven and independent. The visual generator reads only the normalized `TestResult` archive and does not need to know how any quiz was rendered.

## Persistence

- Personality archive: Zustand persisted to localStorage under `shinobiArchiveV9`.
- Generated dossier portrait: IndexedDB database `shinobi-v8-media` retained for V8 compatibility.
- Uploaded reference selfie: intentionally not persisted.

## Prompt behavior

- Image generation keeps Sensei and Shadow Mirror names in the app UI, but converts them to abstract personality/tactical traits before sending the image prompt.
- Named-character visual imitation is intentionally avoided.
- For Uchiha-like eye traits, the prompt requests an original invented red-eye pattern rather than a recognizable canon design.
