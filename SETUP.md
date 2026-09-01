# Shinobi Identity Archive — Setup & Deployment Guide

This is the single source of truth for setting up, upgrading, and deploying the Shinobi Identity Archive.

**Do not create new phase-specific setup Markdown files.** When a future version or phase changes installation, database migrations, environment variables, or deployment steps, update this file instead.

---

## 1. Requirements

- Node.js 22+
- npm
- Git/GitHub
- Supabase project
- Render Web Service (or another Node-compatible host)
- Stripe account for paid generation credits
- OpenAI API account for paid image generation

---

## 2. Install locally

```bash
npm install
```

Create a local `.env` file from `.env.example` and fill in your own values.

Never commit `.env`.

Start the app:

```bash
npm run dev
```

Run the complete validation suite before deployment:

```bash
npm run check
```

`npm run check` runs the automated tests and production build.

---



## V11.2.0 Phase 2 schema upgrade

Phase 2 adds Training Points, ryō, permanent stat-training bonuses, jutsu mastery columns, equipment inventory, and authoritative progression RPCs. Re-run the current:

```text
supabase/schema.sql
```

Apply the schema **before** deploying V11.2.0. Production startup expects schema version `11.2.0`. Existing characters, missions, village memberships, jutsu, payments, and public profiles are preserved.

After deployment, verify `/api/version` reports application/frontend/server/schema version `11.2.0`.

## V11.0.0 schema upgrade

V11 Phase 1 adds persistent village membership and career/world RPCs. Existing deployments upgrading from V10.5.x must re-run the current:

```text
supabase/schema.sql
```

Apply the schema **before** deploying the V11 application. Production startup expects schema version `11.0.0`. The schema is idempotent and preserves existing V10 character, mission, progression, payment, and community data.

After deployment, verify `/api/version` reports application/frontend/server/schema version `11.0.0`.

## 3. Environment variables

### Browser-safe Supabase variables

These values are intentionally bundled into the Vite frontend:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

In newer Supabase projects, use the **Publishable key** (`sb_publishable_...`) for `VITE_SUPABASE_ANON_KEY`.

Do not use a Supabase secret/service-role key in any variable beginning with `VITE_`.

### Server-only Supabase variables

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_OR_SECRET_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` must remain server-side.

### OpenAI image generation

```env
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_IMAGE_MODEL=gpt-image-2
```

The OpenAI key is used only by the Express server and must never be exposed to the browser.

### Stripe

```env
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SIGNING_SECRET
```

### Application URL

```env
APP_URL=https://YOUR_APP_DOMAIN
```

For Render this will typically be similar to:

```env
APP_URL=https://your-service.onrender.com
```

### Port

Local development may use:

```env
PORT=8787
```

Render supplies `PORT` automatically, so it does not need to be manually configured there.

---

## 4. Supabase initial setup

Create a Supabase project, then open **SQL Editor**.

The current release maintains one evolving database definition:

```text
supabase/schema.sql
```

For upgrades to **V10.5.0 or newer**, run the current `supabase/schema.sql` again before deploying the new application code. V10.5.0 adds discovery/index optimizations, cached world statistics, bundled public-profile/social RPCs, and the distributed rate-limit table/RPC used by multi-instance servers.

For a fresh project, run the entire file once. For an existing project, review the current `CHANGELOG.md` and schema diff before applying an update; the schema is written to be repeat-friendly where practical through `IF NOT EXISTS`, `CREATE OR REPLACE`, and policy replacement patterns.

The consolidated schema includes:

- account profiles and multiple saved shinobi
- per-character test results
- generation credits, payments, and generation history
- public profiles, slugs, publishing, and Shinobi World statistics
- jutsu techniques and loadouts
- missions, XP, reputation, and progression RPCs
- teams, rivals, and matchup history
- lore, timeline events, aliases, themes, banners, and featured artwork
- Row Level Security policies and helper functions

Existing character data is intended to remain intact when applying non-destructive schema updates. Back up production data before significant database changes.

---

## 5. Supabase authentication

The application supports persistent Supabase authentication.

After configuration:

1. Start the app.
2. Create an account.
3. Sign in.
4. Open **My Account**.
5. Create a shinobi or import an older local archive.
6. Open a saved shinobi and verify its quiz results load independently from other characters.

V9 introduced cloud accounts while preserving migration from older local archive versions.

---

## 6. Stripe configuration

The application uses Stripe Checkout for generation-credit purchases.

Create a Stripe webhook endpoint:

```text
https://YOUR_APP_DOMAIN/api/stripe/webhook
```

Subscribe the endpoint to:

```text
checkout.session.completed
```

Copy the webhook signing secret (`whsec_...`) into:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Current credit packs are defined server-side in `server/config.ts`.

The current app behavior uses credits for OpenAI image generation, with credits reserved before generation and refunded when generation fails.

---

## 7. OpenAI generation

Paid Shinobi generation uses the server-side OpenAI image API.

The browser sends the authenticated request to the Express API. The Express server supplies the OpenAI API key privately.

Never add this to frontend code:

```text
VITE_OPENAI_API_KEY
```

The key must remain:

```env
OPENAI_API_KEY=...
```

on the server only.

---

## 8. Render deployment

Create one Render **Web Service** connected to the GitHub repository.

Recommended configuration:

```text
Runtime: Node
Build Command: npm install && npm run release:check
Start Command: npm start
```

Add all required environment variables in **Render → Service → Environment**.

Do not upload a secret file. Render environment variables replace the production `.env` file.

### Render public values

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### Render server-only values

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
OPENAI_IMAGE_MODEL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
APP_URL
```

Do not manually set `PORT` unless the host specifically requires it.

Pushes to the configured production branch can trigger automatic Render deployments. Configure the Render health-check path as `/api/health/ready` so a starting, draining, database-unavailable, or schema-mismatched instance does not receive normal traffic.

---

## 9. GitHub secret safety

The repository should contain `.env.example`, not the real `.env` file.

`.gitignore` should exclude at minimum:

```gitignore
node_modules
dist
.env
.env.local
.env.*.local
```

Before committing environment-related changes, run:

```bash
git status
```

Confirm `.env` is not staged.

If a real API key is ever committed, revoke/rotate it immediately. Removing the file in a later commit does not remove the credential from Git history.

---

## 10. Vite environment typing

The repository includes:

```text
src/vite-env.d.ts
```

with Vite client type declarations so TypeScript recognizes:

```ts
import.meta.env
```

The Supabase client helper exposes `isSupabaseConfigured` for optional configuration handling.

---

## 11. Public profiles and privacy

Public profiles are opt-in.

Only explicitly published shinobi should be readable by unauthenticated visitors. Private characters, private lore, timelines, missions, jutsu, account data, payments, and generation history remain protected by Supabase Row Level Security.

After changing database policies, verify both:

- the owner can still access their records;
- a signed-out browser cannot access private records.

---

## 12. Current feature smoke test

After a production deployment, verify the following flow:

1. Open the home page.
2. Sign up or sign in.
3. Create two shinobi characters.
4. Complete different tests for each.
5. Switch between them and confirm their results remain independent.
6. Rename one character and confirm the change persists.
7. Open **Arsenal**, create/save jutsu, and verify it belongs to the active character.
8. Open **Missions**, accept/resolve a mission, and confirm XP/progression persists.
9. Open **Teams**, create a squad, and add valid characters.
10. Add a rival and run a matchup.
11. Open **Chronicle**, edit lore/timeline/profile customization, refresh, and verify persistence.
12. Publish a character and verify its public profile while signed out.
13. Unpublish it and verify public access is removed.
14. If paid generation is enabled, purchase credits in Stripe test mode and verify the webhook credits the correct account.
15. Generate an image and verify the correct credit amount is consumed or refunded on failure.

Use the **Release Checklist** section at the end of this file for production verification.

---

## 13. Updating this guide in future versions

When V11 or a later release changes setup:

- edit this `SETUP.md`;
- update the Supabase schema section when `supabase/schema.sql` changes;
- update the environment-variable section if a new provider or secret is introduced;
- update deployment instructions if hosting architecture changes;
- update the smoke test when major systems are added;
- update `CHANGELOG.md` with the release history.

Do **not** add files such as:

```text
V11_PHASE1_SETUP.md
V11_PHASE2_SETUP.md
NEW_FEATURE_SETUP.md
```

`SETUP.md` should evolve with the application and remain the single setup/deployment reference.

---

## Release Checklist


## Supabase schema

Run the single evolving schema file for fresh installs and upgrades:

```text
supabase/schema.sql
```

The file is designed to be safely re-run as releases add guards, RPCs, indexes, and policies.

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


## Codebase Consolidation

The current release intentionally keeps one evolving database file at `supabase/schema.sql`, one setup guide (`SETUP.md`), and one release history (`CHANGELOG.md`). New releases should update these files instead of adding phase-specific equivalents.

## Current production release — V11.2.0

V10.5.x remains the stable historical baseline. V11.2.0 is the current feature release and requires the Phase 2 schema because training resources, jutsu mastery, and equipment add persistent progression data and RPCs.

### Required upgrade order

1. Back up the current Supabase project/database.
2. Run the current `supabase/schema.sql`.
3. Confirm the live schema preflight reports `11.2.0`.
4. Run `npm install` and `npm run release:check`.
5. Deploy the V11.2.0 application/server.
6. Point the platform health check at `/api/health/ready`.
7. Verify `/api/version` reports application/server/frontend/schema version `11.2.0`.
8. Sign in, select a saved shinobi, join a village, and confirm `/career` reflects the membership.
9. Complete a mission and confirm village reputation/mission totals update on the career and village pages.
10. Publish a test shinobi and confirm its public profile shows the safe public career summary.

### Production environment

```env
TRUSTED_ORIGINS=
DIAGNOSTICS_TOKEN=
STARTUP_LIVE_PREFLIGHT=true
BUILD_COMMIT=
BUILD_ID=
BUILD_TIMESTAMP=
RELEASE_CHANNEL=production
```

Render supplies `RENDER_GIT_COMMIT` automatically when available. Keep `DIAGNOSTICS_TOKEN` unset unless the protected diagnostics endpoint is intentionally enabled.

### Release verification

```bash
npm install
npm run preflight
npm run test:regression
npm run release:check
```

After deployment verify:

```text
GET /api/health/live
GET /api/health/ready
GET /api/version
```

Expected release contract:

```text
Application: 11.5.6
Server:      11.5.6
Frontend:    11.5.6
Schema:      11.4.0
```

### Diagnostics

If `DIAGNOSTICS_TOKEN` is configured, the protected internal snapshot remains available at `GET /api/internal/diagnostics` with `X-Diagnostics-Token`. Structured logs continue to omit secrets, request bodies, prompt contents, images, emails, and user IDs.


## V11.2.0 Phase 3 upgrade

Re-run `supabase/schema.sql` before deploying the V11.2.0 application. The schema adds competitive seasons, Chūnin Exam entries, competitive records, exam RPCs, and the public seasonal leaderboard.


## V11.4.0 Phase 5 upgrade

Re-run `supabase/schema.sql` before deploying V11.4.0. Phase 5 adds cooperative team operations, persistent village-war seasons/deployments, public war standings, and server-authoritative squad deployment RPCs. Production startup expects schema version `11.4.0`.

Recommended rollout:
1. Run the current `supabase/schema.sql`.
2. Run `npm install && npm run release:check`.
3. Deploy the application with `npm start`.
4. Verify `/api/health/ready` and `/api/version`.
5. Confirm app/frontend/server/schema all report `11.4.0`.

## V11.5.5 combat-expansion upgrade

V11.5.5 is application-only and keeps the V11.4.0 database contract. Do not rerun the schema solely for this update if production already reports schema `11.4.0`. Deploy the application, run `npm run release:check`, and confirm `/api/version` reports application/frontend/server `11.5.5` with schema `11.4.0` and `schemaMatches: true`.


## V11.5.6 advanced-combat upgrade

V11.5.6 is application-only and keeps the V11.4.0 database contract. Do not rerun `supabase/schema.sql` solely for this update if `/api/version` already reports schema `11.4.0`. Deploy the new application, run `npm run release:check`, and verify application/frontend/server `11.5.6` with expected schema `11.4.0`.
