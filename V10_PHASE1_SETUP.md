# Shinobi Identity Archive V10 — Phase 1

V10 Phase 1 introduces the first gameplay-oriented character systems: normalized character profiles, deterministic derived combat stats, a profile-aware jutsu forge, saved techniques, and loadout slots.

## Upgrade from V9

1. Keep your existing V9 Supabase database and environment variables.
2. Run `supabase/v10-phase1.sql` in the Supabase SQL Editor.
3. Deploy the V10 source normally (`npm install`, `npm run build`).
4. Open a saved shinobi from **My Account**, then visit **Arsenal**.

No V9 character or test-result rows are deleted or rewritten by this migration.

## Phase 1 systems

- 10 derived combat stats calculated from the active shinobi's completed tests.
- A normalized profile layer so later V10 systems do not need to interpret every quiz independently.
- Jutsu generation informed by clan, chakra, fighting style, specialty, inherited potential, team role, and rank potential.
- Saved jutsu stored per user/per character.
- Loadout assignments: standard, advanced, signature, ultimate, and summoning.

## Security

`jutsu_techniques` uses Row Level Security. Authenticated users can only read and modify rows where `user_id = auth.uid()`.
