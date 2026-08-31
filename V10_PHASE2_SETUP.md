# V10 Phase 2 Setup

1. Update the project with the V10 Phase 2 files.
2. In Supabase → SQL Editor, run `supabase/v10-phase2.sql` once.
3. Keep all existing V9/V10 environment variables. Phase 2 requires no new API keys.
4. Run `npm install` and `npm run build`, then deploy to Render.
5. Sign in, open a saved shinobi, and choose **Missions**.

The migration adds `shinobi_progression`, `shinobi_missions`, RLS policies, and the authenticated `complete_shinobi_mission_v10` RPC. It does not delete or rewrite existing V9/V10 character, quiz, generation, or jutsu data.
