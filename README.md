# Shinobi Identity Archive V10

V10 Phase 2 adds persistent missions, XP, levels, operational rank progression, village reputation, and achievements on top of the V10 Phase 1 combat stats and jutsu system. Existing V9 account/profile data remains compatible.

See `V10_PHASE1_SETUP.md` and `V10_PHASE2_SETUP.md` for Supabase migrations.

# Shinobi Identity Archive V9

V9 turns the Shinobi Identity Archive into an account-ready platform. It keeps the modular React/TypeScript quiz system and AI portrait generator, then adds Supabase authentication and cloud-saved shinobi characters.

## What V9 adds

- Supabase email/password authentication
- Persistent user sessions
- Account dashboard
- Multiple saved shinobi characters per account
- Cloud-saved identity/test results
- Character completion tracking
- Import of existing local V8/V7/V6 archives
- Row Level Security policies so users can access only their own data
- Existing local archive still works when Supabase is not configured
- Existing AI shinobi generator remains available

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Add your Cloudflare values if using the current image generator.
4. Create a Supabase project.
5. Run `supabase/v9.sql` in the Supabase SQL editor.
6. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
7. Run `npm run dev`.

See `V9_SETUP.md` for account/database setup details.

## Production

Keep private provider keys server-side in Render environment variables. Only the Supabase project URL and public anon/publishable key should use the `VITE_` prefix. Never commit your real `.env`.

## Compatibility

V9 uses the local archive key `shinobiArchiveV9` and automatically migrates an existing V8, V7, or V6 archive on first load.


## V9 Phase 2
Adds seven advanced identity trials (Fighting Style, Weapon Affinity, Leadership Style, Rank Potential, Inherited Potential, Shinobi Specialty, Team Role), 13-trial completion progression, archive ranks, badges, and cloud completion mapping.


## V9 Phase 3
Paid OpenAI image generation, Stripe credit packs, atomic credit reservations/refunds, and account-gated generation. See `PHASE3_SETUP.md`.


## V9 Phase 4

Phase 4 adds the Shinobi World: publishable character profiles, share links, active characters, a Discover page, and aggregate public clan/village/chakra/rank/summon statistics. Run `supabase/v9-phase4.sql` after the earlier V9 migrations.


## V10 Phase 3
Teams, rivals, squad analysis and matchup projections are documented in `V10_PHASE3.md` and `V10_PHASE3_SETUP.md`.
