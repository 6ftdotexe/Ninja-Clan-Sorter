# V10 Release Checklist

## Supabase migrations
Run these in order if the production database has not already received them:

1. `supabase/v9.sql`
2. `supabase/v9-phase3.sql`
3. `supabase/v9-phase4.sql`
4. `supabase/v10-phase1.sql`
5. `supabase/v10-phase2.sql`
6. `supabase/v10-phase3.sql`
7. `supabase/v10-phase4.sql`

## Environment
Confirm the browser-safe Supabase variables and all server-only OpenAI / Stripe / Supabase service variables required by Phase 3 are configured in Render. Never prefix server secrets with `VITE_`.

## Verification

```bash
npm install
npm run check
```

Then verify in production:

- Create/sign in to an account.
- Switch between two saved shinobi and confirm results stay separate.
- Rename a shinobi.
- Complete and save a quiz.
- Open Arsenal, generate/save/equip a jutsu.
- Accept and resolve a mission.
- Create a team, rival, and matchup.
- Edit Chronicle and timeline.
- Publish/unpublish a profile.
- Confirm private profiles are not visible publicly.
- Confirm Stripe generation credits cannot be spent without authentication.
- Test on desktop and mobile widths.
