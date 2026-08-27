# V9 Phase 3 — Paid OpenAI Shinobi Generation

Phase 3 replaces the free Cloudflare generation workaround with authenticated, credit-gated OpenAI image editing and Stripe Checkout.

## 1. Database
Run `supabase/v9-phase3.sql` in the Supabase SQL Editor after the existing `supabase/v9.sql` schema.

## 2. Render environment variables
Add these server-only variables in Render:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_IMAGE_MODEL=gpt-image-2`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_URL=https://your-render-app.onrender.com`

Keep the existing public Vite values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never place OpenAI, Stripe secret, or Supabase service-role keys in a `VITE_` variable.

## 3. Stripe webhook
Create a Stripe webhook endpoint pointing to:

`https://YOUR_APP_DOMAIN/api/stripe/webhook`

Subscribe it to `checkout.session.completed`, then put the webhook signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` on Render.

## 4. Credit packs
The server currently defines:

- 1 credit — $1.99
- 3 credits — $4.99
- 10 credits — $12.99

These are defined in `server/index.ts` and can be changed later.

## 5. Generation pricing
- Medium OpenAI generation: 1 app credit
- High OpenAI generation: 2 app credits

Credits are reserved atomically before generation and automatically refunded when generation fails.

## 6. OpenAI
Phase 3 uses the OpenAI `/v1/images/edits` endpoint with `gpt-image-2`, the user's uploaded photo as the image input, and high input fidelity. The OpenAI API key exists only on the server.
