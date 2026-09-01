# Shinobi Identity Archive — Current Architecture

This document describes the current application only. Historical architecture changes belong in `CHANGELOG.md`; setup and deployment instructions belong in `SETUP.md`.


## V11.0.0 structure

The runtime is intentionally organized around a small number of cohesive modules rather than one file per route or feature surface:

```text
src/
  App.tsx                    # routes + global layout/navigation
  types.ts                  # shared domain types
  data/
    clans.ts
    quizzes.ts              # all quiz definitions
  engine/
    scoring.ts
    __tests__/quiz.test.ts
  pages/
    IdentityPages.tsx       # archive + quiz runner + results + dossier
    AccountPages.tsx        # home + auth + account management
    CommunityPages.tsx      # discover + public profiles
    WorldPages.tsx          # village directory, village profile, career record
    SystemPages.tsx         # arsenal + missions + chronicle
    SocialPages.tsx         # teams + rivals + matchups
    GeneratorPage.tsx
  features/
    characters.ts
    generator.ts
    arsenal.ts
    missions.ts
    social.ts
    lore.ts
    world.ts                # living villages + career records
  utils/
    character.ts            # normalized profile, combat stats, progression
  contexts/
    AuthContext.tsx
  store/
    useArchive.ts
  lib/
    supabase.ts
```

This is the preferred consolidation boundary going forward: combine closely related thin files, but keep large domain services, quiz data, shared state, and server code separated.

## Runtime

The product is a React + TypeScript + Vite frontend served alongside an Express API. Production can run as one Node 22+ web service.

- `src/App.tsx` — route table.
- `src/pages/` — route-level UI.
- `server/index.ts` — Express routing, middleware order, production static serving, and startup.
- `server/config.ts` — server-only environment configuration, Supabase admin auth, credit wallet helpers, and shared server types.
- `server/payments.ts` — Stripe checkout, credit packs, and webhook processing.
- `server/generation.ts` — OpenAI image editing, generation persistence, validation, and credit reservation/refunds.
- `server/integrity.ts` — account integrity audit and recovery.
- `server/security.ts` — headers, trusted origins, local fallback limiting, and distributed costly-route throttling.

## Identity engine

Quiz content is centralized in `src/data/quizzes.ts`, including core and advanced question banks plus the normalized test registry. The scoring engine stays separate in `src/engine/scoring.ts`, and consolidated quiz/scoring validation lives in `src/engine/__tests__/quiz.test.ts`. The local active archive is held by Zustand in `src/store/useArchive.ts`.

All shared application contracts now live in one file: `src/types.ts`.

## Feature modules

Closely related logic and persistence are grouped into feature modules instead of being split across one-use service/utility files:

- `src/features/characters.ts` — saved characters, cloud archive syncing, publishing, public discovery, and world statistics.
- `src/features/generator.ts` — AI prompt construction, paid image API client, credit checkout calls, and selected-portrait IndexedDB storage.
- `src/features/arsenal.ts` — jutsu generation and jutsu persistence/loadout operations.
- `src/features/missions.ts` — mission generation, mission resolution, and progression persistence.
- `src/features/social.ts` — teams, rivals, matchup persistence, and tactical analysis.
- `src/features/lore.ts` — chronicle generation, lore persistence, timeline operations, and profile customization.
- `src/features/world.ts` — village directory/profile reads, formal membership, and Shinobi career records.

Shared calculations that are reused across multiple features remain in `src/utils/`:

- `character.ts` — profile normalization, derived combat stats, archive completion, XP, ranks, reputation, and achievements.

## Accounts and database

Supabase provides authentication, persistent characters, quiz results, generation wallets/history, public profiles, jutsu, missions/progression, teams/rivals/matchups, lore, timelines, village membership, village standings, and career records.

The database definition is maintained as one evolving file:

`supabase/schema.sql`

Row Level Security remains the primary browser-data boundary. Server-only Supabase credentials are used only inside the Express backend where elevated access is required.

## Paid image generation

The browser sends authenticated generation requests to the Express API. OpenAI and Stripe credentials remain server-side. Generation credits are reserved before image creation and refunded when generation fails.

The uploaded reference photo is not stored as part of the normal character archive. A selected generated portrait can be cached locally in IndexedDB for dossier rendering.

The active local archive now persists under `shinobiArchiveV10` and automatically imports older V9/V8/V7/V6 archive keys on first load. The older IndexedDB portrait database name is retained intentionally so previously selected portraits remain available.

## Public and social systems

Characters are private by default. Publishing creates an explicitly public character profile and allows public discovery/statistics. Teams, rivals, and matchup history remain account-scoped except where a user intentionally references an already-public character.

## Documentation contract

- `README.md` — project entry point.
- `SETUP.md` — current installation, schema, environment, provider, deployment, and release verification instructions.
- `ARCHITECTURE.md` — current technical structure.
- `CHANGELOG.md` — V1 → current release history.

Do not create phase-specific setup, architecture, or change-summary files for future releases; evolve these four documents instead.


## Shared application helpers

`src/lib/app.tsx` owns cross-page behavior that should not be reimplemented in individual screens: active-shinobi normalization, async action state, standard error conversion, and feedback rendering. Domain-specific database/API behavior remains inside `src/features/*`.


### Data access conventions
Client feature modules use the shared helpers in `src/lib/supabase.ts` (`requireSupabase`, `unwrap`, `unwrapRows`, `unwrapMaybe`, `cleanText`, and `nowIso`) so persistence code has one error-handling and normalization path. Domain queries remain in their feature modules rather than introducing a generic repository abstraction that would obscure Supabase types.


### Shared UI primitives

`src/lib/ui.tsx` contains intentionally small presentation primitives used across consolidated page modules. It centralizes repeated headers, section titles, action rows, progress indicators, empty states, form labels, and social tabs while preserving existing CSS contracts.


### Generator UI

`GeneratorPage.tsx` now uses a local controller hook plus `CreditPanel`, `ControlsPanel`, and `ResultPanel`. Static generator configuration and reusable generator helpers live in `src/features/generator.ts`.


## Stylesheet organization

`src/styles.css` remains a single stylesheet to avoid fragmenting the UI layer, but V10.5.0 removes stale selectors and redundant cascade declarations. Shared primitives stay near the foundation of the file; feature-specific rules remain grouped for identity, generator, account/cloud, community, arsenal, missions, social, and chronicle UI. Dynamic classes such as mission ranks and profile themes are intentionally retained even when they do not appear as literal class strings in JSX.

## Code-quality conventions

- Database and RPC responses should use explicit local row contracts instead of `any`.
- Progression thresholds and other gameplay tuning values should live in named constants or ordered rule tables, not repeated conditional magic numbers.
- Trial counts must derive from `testOrder`; do not hard-code the number of identity trials.
- Legacy local-storage keys remain migration-only compatibility data. New code writes only to `shinobiArchiveV10`.
- Route/page modules may stay consolidated by domain, but reusable business rules belong in feature or utility modules rather than inline JSX.
## Reliability boundaries

V10.5.0 treats browser, network, payment, and generation failures as expected operating conditions rather than exceptional edge cases. Client API calls use bounded timeouts and validate server responses. Archive persistence falls back to memory when browser storage is unavailable, while portrait IndexedDB operations report blocked/timeout/transaction failures cleanly.

Stripe checkout completion is idempotent: `record_generation_payment` records the Stripe session and grants credits in one Postgres transaction, so webhook retries cannot duplicate credits or permanently record a payment without granting its wallet balance. OpenAI generation has server-side timeouts, validates reference-image MIME/decoded size, and reports whether a reserved-credit refund actually succeeded.



## Data integrity and recovery

The authenticated `/api/account-integrity` route performs a user-scoped self-check using the server-side Supabase service client. Safe repairs include active-character normalization, missing public slugs, child-row ownership correction, mission timestamp cleanup, stale generation recovery, and wallet floor reconciliation. Wallet recovery is intentionally conservative: missing recoverable credits may be restored, but unexplained extra credits are reported and never removed automatically.

Client cloud reads also normalize character fields and ignore malformed test-result payloads so a damaged row cannot break the archive UI. The database adds a partial unique index on `shinobi_characters(user_id)` where `is_active=true`, preventing duplicate active characters after legacy data has been normalized.


## Security and abuse boundaries

`server/security.ts` owns lightweight API abuse controls: route-specific in-memory rate limits, trusted-origin validation for protected browser POST requests, and production security headers. Ordinary JSON requests are capped at 64 KB; only `/api/generate-shinobi` receives the larger image payload allowance. The limiter is intentionally process-local, so multi-instance deployments should add an edge/shared limiter if traffic grows beyond one Render instance.

Stripe webhook credit grants never trust browser-controlled prices or credit counts. Completed checkout metadata is verified against the server-owned `CREDIT_PACKS` definition, expected USD amount, `client_reference_id`, and paid status before the idempotent database payment RPC runs.

Public character, lore, and timeline reads no longer rely on direct public RLS access to their base tables. Whitelisted security-definer RPCs return only approved public fields and replace the real owner id with `null`. Social features hydrate referenced public characters through those RPCs while owner rows continue to use normal RLS. Sensitive service-role credit RPCs remain executable only by `service_role`, and authenticated security-definer functions validate `auth.uid()` before mutation.

The database also enforces at most one `processing` generation per user. Combined with API rate limiting and client double-submit protection, this bounds generation spam and prevents parallel credit consumption from the same account.


## Performance and scalability boundaries

- Route modules are loaded with `React.lazy`; consolidated page files remain the code-splitting boundary instead of returning to one file per screen.
- Vite emits dedicated React, Supabase, and image-export vendor chunks so cacheable dependencies do not churn with ordinary feature edits.
- Public discovery uses `list_public_shinobi_page` with a `(published_at/updated_at, id)` cursor and a matching partial index. Do not replace it with large `OFFSET` pagination.
- `get_public_shinobi_profile_bundle` returns the public character, lore, and timeline in one RPC to avoid public-profile N+1 round trips.
- Team/rival hydration uses `get_accessible_shinobi_by_ids`, which returns owned characters and whitelisted public characters in one authenticated call.
- Shinobi World aggregate stats are cached in Postgres for five minutes and deduped in the client for one minute. This intentionally allows bounded staleness for a read-heavy public surface.
- Costly API throttles use `consume_api_rate_limit` in Supabase so limits remain consistent across multiple Node/Render instances. Local memory limiting is only the fallback path.
- Reference photo preprocessing decodes from an object URL and base64-encodes only the compressed JPEG, reducing peak browser memory for large camera photos.
- Production static assets are served with a long immutable cache policy; `index.html` remains uncached.

## Observability and diagnostics boundary

`server/diagnostics.ts` is the single observability layer for the Express process. It assigns/propagates request IDs, emits structured JSON logs, records route latency/error aggregates, classifies server failures, measures named external/database operations, and tracks process/runtime health. It deliberately accepts metadata only; request bodies, reference photos, generated image data, authorization tokens, prompts, email addresses, and user IDs must never be passed into diagnostics fields.

Named timing instrumentation currently covers the most operationally important boundaries: Supabase authentication and wallet operations, generation record persistence, distributed throttling, account integrity checks, Stripe checkout/payment recording, OpenAI generation/downloads, and the Supabase readiness probe. Slow calls emit `slow_operation` warnings while aggregate counts remain available in the protected diagnostics snapshot.

The health model is split into three surfaces:

- `/api/health` remains the backwards-compatible service health endpoint.
- `/api/health/live` answers whether the Node process is serving requests.
- `/api/health/ready` verifies that the account/database path required for normal authenticated operation is usable and returns `503` when it is not.

`/api/internal/diagnostics` returns aggregate route/operation/error metrics plus memory, uptime, and event-loop delay. It is unavailable unless `DIAGNOSTICS_TOKEN` is configured and requires the token in `X-Diagnostics-Token`. The endpoint is not an admin account API and exposes no customer records.

Metrics are intentionally in-memory and instance-local. In a multi-instance deployment, structured logs should be aggregated by the hosting/logging platform; the diagnostics endpoint describes only the instance that receives the request. A future external metrics backend can consume the same event/operation boundaries without changing feature code.

## Deployment and release boundary

`server/release.ts` is the release identity boundary and `server/preflight.ts` is the deployment preflight boundary. The package version, server release constant, generated frontend `dist/release.json`, and Supabase `app_release_metadata.schema_version` are expected to move together. `/api/version` returns all three versions plus commit/build metadata and reports `releaseMatches=false` when they diverge.

Production startup validates configuration first, then runs a live Supabase schema check before the HTTP server begins listening. This deliberately makes schema-first rollout ordering explicit: apply `supabase/schema.sql`, then deploy the Node/frontend release. `STARTUP_LIVE_PREFLIGHT=false` exists only as an emergency bypass and should not be the normal deployment path.

The server lifecycle is `starting → ready → draining`. Readiness returns `503` unless the process is `ready` and the schema marker matches the expected release. `SIGTERM` and `SIGINT` move the process to `draining`, stop new connections, close idle keep-alive connections, and give in-flight work up to 25 seconds to finish before forced termination. This is intended to cooperate with Render rolling replacements instead of cutting off generation/payment requests mid-flight.

Vite emits `dist/release.json` during every production build. The API reads that manifest at runtime rather than assuming the frontend matches the server. This makes `/api/version` useful for identifying stale or mismatched deployment artifacts.



## Regression testing architecture

The regression layer intentionally stays small and colocated with the code it protects. Existing quiz/scoring tests remain under `src/engine/__tests__`, while server/security/release tests live under `server/__tests__`. No additional test framework is introduced beyond Vitest.

Coverage is split into four boundaries:

- **Domain/unit contracts:** scoring, quiz validation, generation normalization, Stripe credit-pack verification, and failure/refund behavior.
- **Security contracts:** trusted-origin checks, security headers, rate limits, and database privilege assertions against `supabase/schema.sql`.
- **Release contracts:** package/server/schema compatibility, static preflight, and release metadata behavior.
- **API smoke contracts:** the real Express app is bound to an ephemeral local port and exercised through HTTP to verify liveness, correlation IDs, public credit-pack shape, controlled API 404s, and diagnostics protection.

`server/index.ts` is now safe to import in tests: application construction is exported, while signal registration/bootstrap only run when the file is the actual process entry point. This prevents tests from opening the production listener or installing process shutdown handlers simply by importing the app.

The consolidated V10.5.0 release aligns the application, server, frontend build manifest, and Supabase schema on version `10.5.0`.

## Stable-candidate hardening

V10.5.0 adds HashRouter-safe Stripe returns, production HSTS/API no-store behavior, explicit Node HTTP timeouts, fatal-process shutdown handling, and a React route error boundary for stale lazy chunks. The production `npm start` path intentionally uses `tsx`, so `tsx` is a runtime dependency.
