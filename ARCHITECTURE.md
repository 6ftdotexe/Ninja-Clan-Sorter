# V7 Architecture

## Layers

### `src/data/tests/`
Pure test content. Each trial owns its outcomes and questions. This is the main content-authoring layer.

### `src/engine/`
Generic randomized selection and weighted scoring. `scoring.test.ts` checks the core behavior.

### `src/store/`
Persistent user profile, history, and pending result. The store migrates V6 local data once.

### `src/pages/`
Route-level orchestration. Pages resolve route params and connect components to the store/navigation.

### `src/components/`
Reusable presentational and quiz components. `QuizRunner` does not know which test it is rendering.

### `src/theme/`
Clan-to-theme tokens used by the root layout to recolor the app after a clan result is archived.

### `src/utils/`
Derived dossier data, archive IDs, and jutsu loadouts.

## Design principle
Test content should be editable without touching routing, persistence, or component logic. Special domain logic belongs in the scoring/util layer, not inside test pages.
