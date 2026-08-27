# V9 Phase 4 Setup — Public Profiles + Shinobi World

Phase 4 adds public character profiles, share links, active-character selection, community discovery, and aggregated public statistics.

## 1. Apply the database migration

In Supabase → SQL Editor, run:

`supabase/v9-phase4.sql`

Run it after `v9.sql` and `v9-phase3.sql`.

The migration adds:
- `public_slug`
- `bio`
- `published_at`
- public read policy for explicitly published characters only
- `get_shinobi_world_stats()` RPC
- `set_active_shinobi()` RPC

No new API keys are required for Phase 4.

## 2. Deploy normally

Keep the existing V9 Phase 3 Render environment variables. Push the Phase 4 files to GitHub and let Render rebuild.

## 3. Test the flow

1. Sign in.
2. Open My Account.
3. Save quiz results into a character.
4. Set that character active.
5. Add a short public bio.
6. Choose **Publish Profile**.
7. Choose **View Public**.
8. Copy/share the public URL.
9. Open **Discover** and verify the character appears.
10. Make the character private and confirm the public URL stops resolving.

## Privacy behavior

Only records with `is_public = true` and a `public_slug` can be read by visitors. Private character records stay protected by the existing owner-only Row Level Security policy. Community statistics aggregate public characters only.
