# V9 Multi-Shinobi Account Hotfix

This patch fixes account switching so each saved shinobi can actually load its own archived test results.

## Changes

- Added `activeCharacterId` to the local V9 archive state.
- Added **Open Shinobi** on each cloud character card.
- Opening a shinobi loads its saved `character_test_results` from Supabase into the quiz/archive UI.
- Switching between two shinobi now swaps the visible test results instead of leaving the previous local results on screen.
- Archiving a new quiz result automatically syncs the selected/open shinobi back to Supabase when signed in.
- Added per-character renaming from the Account page.
- Renaming the currently open shinobi also updates its local archive name.
- New/imported shinobi are automatically opened and marked active.

## No SQL migration required

This hotfix uses the existing `shinobi_characters` and `character_test_results` tables.
