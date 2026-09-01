# Changelog

## V11.5.4 — Tactical Combat Encounters

- Added turn-based tactical battles with HP and chakra resources.
- Added Strike, Guard/Counter, Focus Chakra, and Jutsu actions.
- Connected combat damage to effective stats, training bonuses, equipment bonuses, jutsu rank, and mastery.
- Added distinct pressure, control, and adaptive opponent AI behavior.
- Replaced preliminary and final exam execution wrappers with full combat encounters.
- Preserved server-authoritative Chūnin advancement, qualification, season points, and rewards.
- No Supabase schema change; expected schema remains V11.4.0.


## V11.5.3 — Chūnin Exam Event Upgrade
- Replaced generic exam-stage mini-games with a playable multi-part Chūnin Exam event.
- Added a three-question written judgment examination.
- Added Forest of Trial survival choices with a final extraction challenge.
- Added opponent selection and multi-exchange preliminary battles.
- Added semifinal and championship-final tournament bracket encounters.
- Kept official qualification and season scoring server-authoritative through the existing exam RPC.
- No Supabase schema migration is required; expected schema remains 11.4.0.


## V11.5.2 — Multi-Stage Mission Adventures
- Replaced the single mission mini-game with a three-stage mission run: Infiltration, Objective, and Extraction.
- Added route choices with persistent risk/reward modifiers.
- Added stage map/progress UI and final mission debrief.
- Preserved the V11.4.0 database schema; this is an application-only update.


## V11.5.1 — Activity-Specific Mini-Game Refinement

- Replaced the shared three-drill sequence with activity-specific mini-game plans.
- Missions now emphasize stealth decisions, reaction, and extraction timing.
- Training now emphasizes reaction speed, chakra precision, and execution combos.
- Chūnin Exams now emphasize memory, tactical judgment, and practical execution.
- World Events now emphasize crisis response, incident command, and critical timing.
- Co-op missions now emphasize squad signals, formation decisions, and coordinated commands.
- Village Wars now emphasize frontline decisions, counterattack reaction, and battle formations.
- Jutsu Mastery now emphasizes hand-sign recall, chakra molding, and technique execution.
- Added reaction-grid and timed combo mini-games with difficulty scaling.
- Preserved the V11.4.0 Supabase schema; no migration required.


## V11.5.0 — Interactive Gameplay Update

- Replaced one-click mission resolution with a three-round interactive field challenge.
- Added reusable Chakra Timing, Hand-Sign Memory, and Tactical Decision mini-games.
- Mission success now weights player execution at 70% and character build/profile strength at 30%.
- Added interactive stat training; failed drills spend no TP and elite scores can complete two training sessions.
- Added interactive jutsu mastery drills before mastery resources are committed.
- Added interactive Chūnin Exam stage gates before official server evaluation.
- Added interactive World Event operations before participation resolves.
- Added cooperative squad command challenges before team operations deploy.
- Added Village War frontline command challenges before daily war deployments commit.
- Added responsive modal gameplay UI and mobile controls.
- Application/frontend/server release is 11.5.0; Supabase schema remains 11.4.0 because this update does not add database contracts.

## V11.4.0 — Bingo Book hotfix
- Fixed the public Bingo Book layout colliding with the Chronicle dossier `.bingo-grid` styles.
- Added defensive normalization for public Bingo Book RPC rows.
- Prevented malformed/null threat classes, bounties, or public slugs from crashing the page.
- Improved mobile layout for public Bingo Book cards.


## V11.4.0 Schema Hotfix

- Fixed rerunning `supabase/schema.sql` from older V10/V11 databases when `join_village(uuid,text)` already exists with the legacy `jsonb` return type.
- The schema now explicitly drops the legacy function signature before recreating the canonical `public.village_memberships`-returning RPC.
- Kept the deployed release contract at `11.4.0`; this is a migration/idempotency correction only.

## V11.4.0 — Phase 5: Cooperative Missions & Village Wars

- Added persistent cooperative squad operations for D/C/B/A/S ranks.
- Added server-authoritative squad scoring based on team size, owned-shinobi level, mission experience, and training investment.
- Added squad operation history, contribution scores, daily per-rank deployment limits, and progression rewards for owned squad members.
- Added `/operations` with rank selection, deployment controls, rewards, and field history.
- Added the first persistent village-war season, `Five Kage Front`.
- Added one village-war deployment per squad per day.
- Required village-war squads to contain at least two owned shinobi formally serving the same village.
- Added public village-war standings with war points, victories, deployment counts, and ranks.
- Added `/wars` with live standings, squad deployment, and personal deployment history.
- Connected village-war success to Training Points, ryō, and village reputation.
- Added Phase 5 tables, indexes, RLS boundaries, authenticated deployment RPCs, public standings RPCs, and regression schema contracts.
- Bumped application, frontend, server, and Supabase schema to 11.4.0.

## V11.3.0 — Phase 4: Dynamic World Events & Rogue Shinobi

- Added persistent active world events and event participation.
- Added `/world` with limited-time operations, difficulty, participation totals, and contribution tracking.
- Connected level, completed missions, training bonuses, allegiance, and event difficulty to server-authoritative event resolution.
- Added world-event Training Point, ryō, and reputation rewards.
- Added the missing-nin career path with `/rogue`.
- Added level/mission eligibility checks before defection.
- Added persistent notoriety, bounty, threat class, rogue title, last-known village, and rogue-since tracking.
- Rogue world-event participation converts reputation rewards into notoriety and bounty growth.
- Added public `/bingo-book` rankings for published rogue shinobi without exposing account-owner data.
- Rejoining a village automatically clears active rogue status so allegiance remains singular.
- Added Phase 4 database indexes, RPC security boundaries, regression schema contracts, navigation, responsive UI, and documentation.
- Bumped application, frontend, server, and Supabase schema to 11.3.0.

## V11.2.0 — Phase 3: Chūnin Exams & Competitive Seasons

- Added four-stage Chūnin Exams: Tactical, Survival, Preliminaries, and Finals.
- Added server-authoritative registration requirements and stage scoring.
- Added persistent competitive records, season points, exam wins, and best finishes.
- Added public seasonal leaderboard and current-season surface.
- Connected career level, mission depth, training bonuses, and jutsu mastery to exam performance.
- Added Chūnin Certified and Chūnin Exam Champion outcomes with TP/ryō rewards.
- Added `/exams` and `/seasons` routes and Phase 3 navigation.
- Bumped application and schema to 11.2.0.

## V11.1.0 — Phase 2: Training, Jutsu Mastery & Equipment

- Added mission-earned Training Points and ryō as persistent per-character progression resources.
- Added `/training` with permanent stat specialization capped at +15 per stat.
- Added jutsu mastery XP and mastery levels 1–5 for saved techniques.
- Added a server-authoritative equipment catalog, inventory, purchases, and one-equipped-item-per-slot loadouts.
- Added weapon, armor, tool, and accessory stat bonuses.
- Extended Arsenal with mastery training, owned equipment, equip/stow controls, and a ryō catalog.
- Extended mission previews to show Training Point and ryō rewards.
- Hardened progression creation so new resource balances and training bonuses must start at zero.
- Restricted direct browser updates to jutsu mastery while preserving loadout-slot updates.
- Added authenticated RPCs for training, mastery, equipment purchase, inventory listing, and equip state.
- Bumped application, frontend, server, and Supabase schema release to `11.1.0`.
- V11.1.0 requires rerunning `supabase/schema.sql` before deployment.

## V11.0.0 — Phase 1: Living Villages + Career Records

- Added persistent formal village membership for each owned shinobi across Konohagakure, Sunagakure, Kumogakure, Iwagakure, and Kirigakure.
- Added a Living Villages directory with village level, membership, total reputation, mission contribution, and standing score.
- Added dedicated public village pages with community summaries and ranked public rosters.
- Added join, switch, and leave village flows protected by authenticated Supabase RPCs.
- Added persistent Shinobi Career records that combine XP, field level, operational rank, mission outcomes, success rate, village reputation, titles, and next-promotion milestones.
- Added public career summaries to published Shinobi profiles without exposing account-owner data.
- Connected existing V10 mission/progression data directly into V11 village standings and career progression.
- Added `/villages`, `/villages/:villageId`, and `/career` routes plus V11 navigation/branding.
- Added `village_memberships` with RLS, indexes, safe public world RPCs, authenticated career RPCs, and V11 schema contracts.
- Bumped application, frontend, server, and Supabase schema release to `11.0.0`.
- V11.0.0 requires rerunning `supabase/schema.sql` before deployment.

## V10.5.1 — Build Compatibility Hotfix


- Fixed server observability typing to accept Supabase PostgREST thenables (`PromiseLike`) during full TypeScript builds.
- Fixed strict null narrowing for Supabase admin and Stripe clients captured by async callbacks.
- Fixed typed Express response mocks used by regression tests.

- Fixed Supabase single-row response typing so `.single()` results can safely pass through shared result helpers when PostgREST failure responses contain `data: null`.
- Fixed Zustand archive migration storage typing by preserving the synchronous `StateStorage` implementation instead of widening `getItem()` to the async-compatible union type.
- No database migration required; V10.5.1 continues to target the V10.5.0 Supabase schema.
- Fixed strict TypeScript compilation for server test response mocks by removing method-level `this` mutation from mocked Express responses.


## V10.5.0 — Consolidation, Hardening & Stable Production Update

This single post-Phase-4 update consolidates all cleanup, refactoring, production hardening, and release-readiness work completed after the V10 feature phases. The intermediate internal iterations are intentionally folded into this one maintained release entry.

### Codebase consolidation and refactoring
- Consolidated version history into `CHANGELOG.md` and all operational setup into `SETUP.md`.
- Consolidated historical Supabase phase scripts into one evolving `supabase/schema.sql`.
- Consolidated shared TypeScript contracts, quiz definitions, test definitions, route pages, utilities, and feature modules where separate files added little value.
- Reduced source-file and documentation sprawl while preserving the complete V10 feature set.
- Refactored repeated UI patterns into a compact shared UI layer and standardized async action/error state handling.
- Refactored the feature/data layer to centralize Supabase result handling, row normalization, timestamps, text cleanup, and batched writes.
- Refactored the server into focused configuration, payment, generation, security, integrity, diagnostics, preflight, and release modules while keeping `server/index.ts` as a small bootstrap/router entry point.
- Refactored the generator into controller/presentation sections and centralized generation modes, costs, validation, image preprocessing, and API request handling.
- Cleaned legacy CSS, removed stale selectors, consolidated repeated rules, and preserved the current V10 visual contract.
- Replaced weak feature-layer `any` usage with explicit row/RPC types and centralized progression/stat constants.

### Reliability and recovery
- Added stale-request protection, concurrent-action safety, timeouts, invalid-response handling, and safer loading/error behavior.
- Added IndexedDB and localStorage fallbacks so portrait/archive failures do not crash the app.
- Added atomic, idempotent Stripe payment recording and credit granting.
- Added generation double-submit protection, timeout handling, accurate refund reporting, and post-purchase credit polling.
- Added an authenticated account self-check that can repair duplicate/missing active characters, orphaned ownership metadata, inconsistent mission timestamps, stale generation records, missing share slugs, and recoverable wallet imbalances.
- Added database-level single-active-character and single-processing-generation constraints.

### Security and abuse resistance
- Added route-specific API rate limiting, trusted-origin checks, production security headers, HSTS, no-store API caching, and smaller default request-body limits.
- Added distributed Supabase-backed throttling for costly generation, checkout, and account-recovery routes with in-memory fallback.
- Hardened Stripe checkout/webhook validation against pack, amount, currency, owner, status, and metadata tampering.
- Moved public character/lore/timeline reads behind whitelisted RPCs so published profiles do not expose private account columns.
- Tightened PostgreSQL function privileges and RLS ownership boundaries.
- Made mission rewards server-authoritative and prevented browser-side progression/reward tampering.
- Added stricter reference-image, prompt, generated-image MIME/size, and API validation boundaries.

### Performance and scalability
- Added route-level React lazy loading and vendor chunking.
- Added cursor-based public Shinobi pagination and load-more discovery.
- Added bundled public-profile reads, targeted database indexes, and improved team/rival hydration.
- Added cached Shinobi World aggregate statistics.
- Reduced reference-photo preprocessing memory usage and added lazy/async decoding for community artwork.
- Added long-lived caching for hashed production assets while keeping HTML uncached.

### Observability and diagnostics
- Added structured JSON request logging with `X-Request-ID` correlation.
- Added categorized errors, route metrics, slow-operation warnings, external-operation timing, memory/event-loop diagnostics, and user-visible support references.
- Added `/api/health/live`, `/api/health/ready`, and a protected `/api/internal/diagnostics` surface.
- Added lifecycle events for Stripe, image generation, account integrity, startup, shutdown, and failures without logging secrets, prompts, images, emails, user IDs, or request bodies.

### Deployment and release hardening
- Added startup configuration validation and schema compatibility preflight before production begins accepting traffic.
- Added graceful `SIGTERM`/`SIGINT` draining with bounded shutdown time and explicit Node HTTP timeouts.
- Added `GET /api/version`, generated `dist/release.json`, build/commit metadata, and server/frontend/schema release-match reporting.
- Added `app_release_metadata` plus the service-role-only `get_app_schema_version()` RPC.
- Added `npm run preflight`, `npm run preflight:live`, `npm run preflight:artifact`, and `npm run release:check`.
- Added a React route error boundary and stale lazy-chunk recovery after deployments.
- Fixed Stripe Checkout return routing for the application's `HashRouter`.
- Moved `tsx` into production dependencies because the deployed server runs through `tsx`.

### Automated regression coverage
- Added Vitest coverage for quiz/scoring behavior, server security middleware, trusted origins, rate limits, Stripe checkout validation, generation validation/failure recovery, schema contracts, release/preflight contracts, and real Express HTTP smoke tests.
- Refactored server bootstrap so the Express app can be imported safely during tests without starting the production listener.
- Added built-artifact verification for `dist/index.html`, hashed asset references, and `dist/release.json`.
- `npm run release:check` now verifies regression tests, TypeScript, the production build, and deployable artifacts together.

### Stable release contract
- Application/server/frontend version: **10.5.0**.
- Supabase schema version: **10.5.0**.
- This is the maintained V10 stable baseline. Future V10.5.x releases should be limited to bug, security, deployment, or regression fixes; new product/gameplay work moves to V11.

## V10 — Shinobi World Systems

V10 shipped through four feature phases. All post-Phase-4 cleanup, final polish, refactoring, hardening, testing, and production-readiness work is consolidated above into the single **V10.5.0 Stable Production Update**.

### Phase 4 — Chronicle, Bingo Book & customization
- Added a persistent Shinobi Chronicle for each saved character.
- Added profile-aware lore generation for origin, academy history, mentor history, turning point, current objective, and personality summary.
- Added editable Bingo Book intelligence entries, aliases, titles, and threat ratings.
- Added persistent character timelines with generated and custom events.
- Added profile themes, banner artwork, featured artwork, and richer public-profile presentation.
- Added Supabase persistence/RLS for character-history data.

### Phase 3 — Teams, rivals & matchups
- Added persistent shinobi squads with up to four members.
- Added support for mixing owned characters and public profiles on teams.
- Added squad cohesion, coverage, leadership, overall ratings, and suggested tactical roles.
- Added persistent rivalries and rivalry notes.
- Added matchup analysis based on character stats, chakra interactions, summons, win conditions, and confidence ratings.
- Added saved matchup history and Supabase RLS for social-combat records.

### Phase 2 — Missions, XP & progression
- Added D/C/B/A/S-rank missions tailored to the active shinobi profile.
- Added mission acceptance, resolution, failure, and abandonment flows.
- Added XP, levels, village reputation, reputation titles, achievements, and mission history.
- Added operational rank progression from Genin through Kage.
- Tied Kage promotion to field progression plus Kage/Legendary Rank Potential.
- Added atomic Supabase mission-completion logic so rewards and state update together.

### Phase 1 — Combat stats & jutsu
- Added a normalized character model that converts quiz results into one consistent profile.
- Added 10 derived stats: Ninjutsu, Taijutsu, Genjutsu, Intelligence, Speed, Strength, Stamina, Chakra Control, Leadership, and Adaptability.
- Added the Combat Arsenal and profile-aware Jutsu Forge.
- Added persistent jutsu libraries per shinobi.
- Added jutsu metadata including rank, type, chakra nature, range, role, cost, strengths, weaknesses, requirements, and synergies.
- Added Standard, Advanced, Signature, Ultimate, and Summoning loadout slots.

## V9 — Accounts, Cloud Profiles & Community

### Rank Potential hotfix
- Added reachable Kage Potential and rare Legendary Potential outcomes.
- Preserved Kage Candidate as a separate result.
- Rebalanced upper-tier scoring around leadership, judgment, accountability, crisis handling, and long-term impact.

### Multi-shinobi hotfix
- Fixed separate characters incorrectly sharing the same visible quiz/archive state.
- Added Open Shinobi behavior that loads that character's saved test results.
- Added active-character tracking and automatic cloud synchronization.
- Added shinobi renaming from the account dashboard.

### Quiz hotfix
- Reworked advanced-test questions so answer choices match the question being asked.
- Standardized rendered questions to four distinct answer options.
- Improved score mappings and added validation for question IDs, options, outcomes, and test lengths.

### Phase 4 — Public profiles & Shinobi World
- Added opt-in public shinobi profiles and shareable profile URLs.
- Added publish/unpublish controls, public bios, and active-shinobi selection.
- Added native sharing/copy-link support.
- Added the Discover page and public-profile gallery.
- Added aggregate public statistics for clans, villages, chakra, ranks, summons, and community totals.
- Expanded Supabase RLS to keep private characters private while allowing published characters to be discovered.

### Phase 3 — Paid OpenAI generation
- Replaced the free Cloudflare generation workaround with OpenAI image editing/generation for stronger reference-photo preservation.
- Added Stripe Checkout and account-based generation credits.
- Added credit packs, generation quality tiers, atomic credit reservation, and failure refunds.
- Added payment and generation history.
- Added secure Stripe webhook verification and server-side Supabase authorization.
- Kept OpenAI, Stripe, and Supabase service-role secrets server-side only.

### Phase 2 — Advanced identity & progression
- Expanded the identity system from 6 to 13 trials.
- Added Fighting Style, Weapon Affinity, Leadership Style, Rank Potential, Inherited Potential, Shinobi Specialty, and Team Role tests.
- Added Core vs Advanced Identity sections, completion percentage, archive ranks, and achievement badges.
- Expanded the Master Profile and cloud mapping to include advanced results.

### Phase 1 — Accounts & cloud shinobi
- Added Supabase email/password authentication and persistent sessions.
- Added an account dashboard and multiple saved shinobi per account.
- Added cloud-backed character and test-result storage.
- Added character completion tracking and local V8/V7/V6 archive migration.
- Added Row Level Security so users can access only their own private records.
- Preserved local archive behavior when Supabase is not configured.

## V8 — AI Shinobi Generator
- Added photo-based AI shinobi generation to the React/TypeScript sorter.
- Added portrait, full-body, action, and dossier composition modes.
- Added profile-driven prompt construction using clan, village, rank, role, chakra, summon, mentor, shadow, leadership, inherited traits, and specialization.
- Added server-side image-provider integration so private API credentials never ship to the browser.
- Added generated-portrait storage in IndexedDB and dossier portrait integration.
- Added V7/V6 archive migration into V8.
- Iterated through Cloudflare Workers AI reference-image approaches, including FLUX, DreamShaper, and Llama Vision-assisted prompting while keeping a free/low-cost path available.
- Added Short/Medium/Long quiz-depth support and expanded question banks to reduce repetition.

## V7 — Product-quality React pass
- Added real application routing with React Router.
- Split each test into independent data modules.
- Deepened question banks and scoring coverage.
- Added clan-driven visual themes and route/quiz animations.
- Added automated Vitest coverage for the scoring engine.
- Added migration from V6 localStorage into the V7 archive key.
- Formalized routes for landing, archive, reusable quizzes, results, and dossier.

## V6 — React/TypeScript refactor
- Rebuilt the V5 single-file application as modular React + TypeScript + Vite.
- Added Zustand persistent archive state.
- Added a reusable scoring engine and generic QuizRunner shared by all six trials.
- Split content, engine, store, components, utilities, and shared types into separate modules.
- Added PNG dossier export with `html-to-image`.
- Established the architecture used by later versions.

## V5 — Complete six-trial identity archive
- Expanded the archive to six connected trials: Clan, Village, Sensei, Shadow, Chakra, and Summoning.
- Added dedicated primary/secondary chakra scoring and advanced-release results.
- Added summoning contracts and a complete six-trial master dossier.
- Added recommended technique/loadout output and downloadable dossier imagery.
- Added completion-gated full-profile generation and richer archive history/community presentation.

## V4 — Identity Archive foundation
- Evolved the original clan sorter into a persistent Shinobi Identity Archive.
- Added named profiles stored in localStorage.
- Added dedicated Clan, Village, Sensei, and Shadow trials.
- Added a dashboard, archive history, completion/progression display, and master identity summary.
- Added retakes, result archiving, copyable results, and a clearer multi-test workflow.

## V3 — Expanded examination
- Expanded the clan pool and question bank substantially.
- Added randomized examinations so repeated runs were less predictable.
- Added broader personality, role, leadership, chakra, and village scoring dimensions.
- Added richer clan result details and secondary affinity rankings.
- Added result-card saving/copying and a more polished examination flow.

## V2 — Advanced clan sorter
- Expanded the original clan-only scoring into multiple dimensions: clan, chakra, village, combat role, leadership, and temperament.
- Added stronger result explanations, strengths/weaknesses, specialty, rank potential, and alternate clan affinities.
- Added back-navigation during the test and copyable results.
- Introduced rarity-adjusted clan scoring and personality spectrums.

## V1 — Original Shinobi Clan Sorter
- Launched the initial single-page clan personality quiz.
- Added question-based weighted clan scoring.
- Added a primary clan result with match percentage, description, chakra affinity, combat style, traits, and alternate clan rankings.
- Established the visual identity and core concept that became the Shinobi Identity Archive.

---

## Changelog maintenance rules

For future releases:
1. Add the newest version or hotfix at the top of this file.
2. Keep entries focused on meaningful user-facing, architecture, data, security, or deployment changes.
3. Do not create another version-specific change-summary Markdown file.
4. Keep all setup, schema, environment, and deployment instructions in `SETUP.md`.
5. Update `ARCHITECTURE.md` for current structure rather than creating version-specific architecture documents.
