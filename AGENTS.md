# Repository Guidelines

## Project Structure & Module Organization
- Core app entry lives in `src/main.ts`, bootstrapping Vue 3 with Pinia.
- Primary view markup resides in `src/App.vue`; custom timeline logic is in `src/components/HourlyTimestrip.vue`.
- State syncing with Markwhen comes from `src/markwhenStore.ts` via `useLpc`.
- Static assets and reference screenshots are kept in `src/assets`.
- Tooling configs: Vite (`vite.config.ts`), TypeScript (`tsconfig*.json`), Tailwind/PostCSS (`tailwind.config.js`, `postcss.config.js`).

## Build, Test, and Development Commands
- `npm run dev` — start Vite dev server on port 6180; great for interactive work with Markwhen.
- `npm run build` — run type-checks then production build.
- `npm run build-only` — build without type-check (useful for quick iterations).
- `npm run type-check` — static type validation via `vue-tsc`.
- `npm run preview` — serve the production build locally on port 5176.

## Coding Style & Naming Conventions
- Use TypeScript everywhere; prefer `<script setup lang="ts">` in SFCs.
- Indentation is two spaces; keep imports sorted by source proximity (local after packages).
- Vue components use `PascalCase` filenames; composables/stores use `camelCase` and live in feature folders.
- Keep CSS minimal and scoped per component; lean on utility classes only if Tailwind is enabled in the file.
- Favor pure functions and computed props over ad-hoc mutations; update shared state through Pinia helpers.

## Testing Guidelines
- No unit test suite is present; treat `npm run type-check` as the baseline gate before pushing.
- If you add tests, colocate them near the feature (e.g., `src/components/__tests__/HourlyTimestrip.spec.ts`) and document the runner.
- When altering date/time math or Markwhen IPC (`useLpc`), add targeted checks or lightweight assertions to catch regressions.

## Commit & Pull Request Guidelines
- Recent history uses short, descriptive messages (e.g., `added example text`); keep commits focused and sized for easy review.
- Reference related issues in the description; summarize user-facing changes plus any Markwhen schema assumptions.
- Include repro steps or screenshots/GIFs when UI changes; note any timeline header options you rely on (e.g., `laneHeight`, `skipDates`).
- Ensure builds and type-checks pass before opening a PR; call out risk areas (time calculations, date parsing, external messaging).

## Architecture & Integration Notes
- The view relies on Markwhen host messages via `useLpc`; prefer adding new requests there rather than bypassing the store.
- Time rendering is sensitive to header options (`hourWidth`, `laneHeight`, `skipDates`, labels). Validate with varied timelines before merging.
- Keep the timeline performant: avoid per-frame allocations and debounce expensive recomputations when adding watchers.
