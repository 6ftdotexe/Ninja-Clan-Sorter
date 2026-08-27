# V9 setup

1. Create a Supabase project.
2. Open Supabase SQL Editor and run `supabase/v9.sql`.
3. In Project Settings/API copy the project URL and anon/publishable key.
4. Add locally to `.env` and on Render as environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Keep service-role keys out of the frontend. Phase 1 does not require one.
6. Run `npm install`, then `npm run dev`.
7. Create an account, sign in, visit `#/account`, and import the existing local V8/V7 archive.

Cloudflare/OpenAI/Stripe secrets remain server-only and should never use a `VITE_` prefix.
