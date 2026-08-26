# Shinobi Identity Archive V7

V7 is the product-quality pass on the React/TypeScript refactor. It keeps the six connected trials from V6 but gives them real routing, independent data modules, deeper question banks, clan-driven visual theming, route/quiz animations, V6 local-profile migration, and automated scoring tests.

## Stack
- React 19 + TypeScript
- Vite
- React Router (HashRouter for static hosting)
- Zustand persistence
- html-to-image dossier export
- Vitest

## Run
```bash
npm install
npm run dev
```

## Validate
```bash
npm run test
npm run build
```

## Routes
- `#/` landing page
- `#/archive` master profile
- `#/test/:testId` reusable quiz runner
- `#/result/:testId` result reveal
- `#/dossier` completed six-trial dossier

## Add a new question
Edit only the relevant file under `src/data/tests/`. UI and scoring do not need to change.

## Add a new trial
1. Extend `TestId` in `src/types/quiz.ts`.
2. Create a test module in `src/data/tests/`.
3. Register it in `src/data/tests/index.ts`.
4. Add any special scoring rules only if the trial requires them.

## V6 migration
On first load V7 copies the existing `shinobiArchiveV6` localStorage payload into `shinobiArchiveV7` when no V7 profile exists.
