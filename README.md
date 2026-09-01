# Shinobi Identity Archive — V11


## V11.5.6 — Advanced Combat Depth

V11.5.6 deepens the shared tactical-combat layer with elemental matchups, status effects, jutsu cooldowns, accuracy/evasion, one-use equipment actions, summoning support, charged ultimate techniques, multi-phase bosses, and stronger visual battle feedback. Existing mission, exam, rival, matchup, world-event, and Bingo Book encounters all inherit the upgraded engine.

This is an application-only gameplay update. It continues to run against the V11.4.0 Supabase schema, so no database migration is required when upgrading from V11.4.0 or any V11.5.x build.


## V11.5.5 — Combat Expansion

V11.5.5 turns tactical combat into a shared gameplay system instead of an exam-only mechanic. Mission objectives now include live encounters, rivalries and Matchup Lab can be fought directly, combat-heavy world events become boss battles, and public Bingo Book targets can be hunted interactively. Player builds still combine identity stats, training, equipment, and mastered jutsu.

This is an application-only gameplay update. It runs against the existing V11.4.0 Supabase schema, so no schema migration is required when upgrading from V11.4.0.
V11 is the current major release of the Shinobi Identity Archive. Phase 5 turns squads and villages into shared operational systems: teams can deploy into cooperative missions, village-aligned squads can contribute to a persistent village-war season, and career/training progression feeds directly into team performance.

## V11 Phase 5 — Cooperative Missions + Village Wars

V11.4.0 adds `/operations` and `/wars`. Cooperative operations require multi-member squads and resolve from squad size plus owned-shinobi career/training progression. Successful operations reward every owned shinobi on the squad. Village wars add a public five-village seasonal leaderboard, daily same-village squad deployments, war points, victories, and progression rewards.

This release requires the V11.4.0 Supabase schema before deployment. Run `npm run release:check`, apply `supabase/schema.sql` first, deploy the application, then verify `/api/health/ready` and `/api/version`.

## Documentation

- `SETUP.md` — install, configure, initialize Supabase, connect OpenAI/Stripe, deploy, and verify production.
- `ARCHITECTURE.md` — current application structure and data flow.
- `CHANGELOG.md` — complete V1 → current release history.

These files evolve with the application. Do not add phase-specific documentation files.

## Local development

```bash
npm install
npm run dev
```

Validate before deployment:

```bash
npm run check
```

## Current project layout

```text
src/
  pages/        route-level screens
  data/         clans + consolidated quiz definitions
  engine/       scoring engine + consolidated quiz tests
  features/     character, generator, arsenal, mission, social, lore domains
  utils/        shared combat/progression calculations
  contexts/     authentication state
  store/        active local archive
  lib/          shared app, UI, and Supabase helpers
  types.ts      shared application contracts
server/
  index.ts      Express API + production lifecycle
  release.ts    version/build/schema release identity
  preflight.ts  static/live deployment checks
supabase/
  schema.sql    current evolving database schema
```

## Security model

Only browser-safe Supabase values use the `VITE_` prefix. OpenAI, Stripe, and Supabase service-role credentials stay server-side and must never be committed to GitHub. Protected POST routes enforce trusted browser origins and rate limits, and public Shinobi data is exposed through whitelisted RPCs instead of direct public table reads.

See `SETUP.md` for the complete current configuration.

## Codebase consolidation

The maintained frontend remains intentionally compact, with related route surfaces grouped by domain rather than split into one-file-per-screen modules.

V11 keeps related routes and UI surfaces together to reduce file count without collapsing independent domain services into oversized modules. See `ARCHITECTURE.md` for the current structure.


### Server modules

The production API is intentionally split into a small set of focused modules: `server/index.ts` (routing/bootstrap/lifecycle), `server/config.ts` (server configuration/auth/credits), `server/release.ts` + `server/preflight.ts` (release identity and deployment gates), `server/payments.ts` (Stripe), and `server/generation.ts` (OpenAI image generation).

## Performance model

V10.5.0 code-splits route modules, cursor-paginates public discovery, bundles public profile reads, caches aggregate world statistics, reduces social hydration queries, and uses Supabase-backed distributed throttling for costly API routes. The existing compact file structure is preserved; performance work does not re-expand the project into one file per route.

## Automated regression coverage

The V10.5.0 stable update includes a compact regression suite around the hardened production paths without introducing a separate testing framework or test documentation tree. Vitest now covers quiz/scoring behavior, security middleware, Stripe pack validation, generation input/failure recovery, release/preflight contracts, Supabase schema permissions, and API smoke behavior.

```bash
npm run test:unit
npm run test:smoke
npm run test:regression
npm run release:check
```

`test:unit` exercises deterministic business/security contracts. `test:smoke` boots the Express application on an ephemeral local port and verifies core public API behavior, request correlation, security headers, and diagnostics protection. `release:check` runs the complete regression suite, TypeScript/Vite build validation, and a post-build artifact preflight that verifies `dist/index.html` plus the generated `dist/release.json` version contract.

## Production observability

The V10.5.0 stable update includes structured JSON request/event logs, per-request correlation IDs, operation timing, slow-operation warnings, categorized error counts, separate liveness/readiness probes, and an optional protected diagnostics snapshot. The server intentionally does not log authorization headers, prompt contents, photos, generated image data, emails, user IDs, or request bodies.

Health endpoints:

```text
GET /api/health
GET /api/health/live
GET /api/health/ready
```

If `DIAGNOSTICS_TOKEN` is configured, internal aggregate diagnostics are available from:

```text
GET /api/internal/diagnostics
X-Diagnostics-Token: <DIAGNOSTICS_TOKEN>
```

The diagnostics snapshot is process-local and is intended for fast production troubleshooting rather than permanent analytics storage.
## Deployment and release hardening

The V10.5.0 stable update treats a deploy as one coordinated frontend/server/schema release. `npm run release:check` runs the test/build path plus static preflight validation, while production startup performs a live schema-version preflight before listening. The process enters a draining readiness state on `SIGTERM`/`SIGINT`, stops accepting new connections, closes idle keep-alive sockets, and allows in-flight requests up to 25 seconds to finish.

Release identity is available from:

```text
GET /api/version
```

The response reports the actual bundled frontend manifest, server version, database schema version, commit/build metadata, and whether all three release surfaces match. Hashed frontend assets remain immutable; `dist/release.json` is generated during every Vite build and is used by the server to verify the frontend bundle it is serving.

For production rollouts, apply the current `supabase/schema.sql` first, deploy the application second, and configure Render health checks to use `/api/health/ready`.



## V11 Phase 3

Phase 3 adds Chūnin Exam registration, four server-authoritative exam stages, persistent competitive records, seasonal points, public leaderboards, qualification titles, and tournament rewards. New routes: `/exams` and `/seasons`.


## V11 Phase 5

Phase 5 adds `/operations` and `/wars` on top of the existing Phase 4 world-state layer. Team operations reward owned squad members, while village-war deployments require at least two owned shinobi serving the same village and contribute to a public seasonal war leaderboard.
