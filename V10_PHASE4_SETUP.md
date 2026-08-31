# V10 Phase 4 Setup

1. Deploy the V10 Phase 4 source over the existing V10 project.
2. Open Supabase → SQL Editor.
3. Run `supabase/v10-phase4.sql` after the Phase 1–3 migrations.
4. Redeploy the Render service.
5. Sign in, open a saved shinobi, then open **Chronicle** from the navigation or account card.

No new environment variables or API keys are required.

## New tables
- `character_lore`
- `character_timeline_events`

## New `shinobi_characters` fields
- `shinobi_alias`
- `profile_title`
- `profile_theme`
- `banner_url`
- `featured_art_url`

Private lore and timeline data remains owner-only. Public read access is allowed only when the parent shinobi profile is published.
