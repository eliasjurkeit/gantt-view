# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev            # Vite dev server on port 6180 (bound to 0.0.0.0)
npm run build          # Type-check then production build
npm run build-only     # Production build, no type-check (fast iteration)
npm run type-check     # vue-tsc type validation — the baseline gate; no unit test suite exists
npm run preview        # Serve production build on port 5176
```

Path alias `@/*` resolves to `./src/*` (configured in both Vite and tsconfig).

## Architecture

This is a **Markwhen view plugin** — a Vue 3 app that renders a Gantt chart inside the Markwhen timeline editor. It receives parsed timeline data from the Markwhen host via an IPC-style channel and renders it as an interactive hourly Gantt strip.

### Data flow

```
Markwhen host  ──postMessage──>  useLpc  ──>  markwhenStore (Pinia)  ──>  HourlyTimestrip.vue
                <──postRequest──  (bidirectional)
```

- `src/Markwhen/markwhenStore.ts` — Single Pinia store. Owns all host communication via `useLpc` from `@markwhen/view-client`. Exposes `app` (theme/UI state) and `markwhen` (parsed events). All new host requests should go through `postRequest` here; don't bypass the store.
- `src/components/HourlyTimestrip.vue` — The entire Gantt visualization (~1760 lines). All layout math, time calculations, lane/overlap detection, scroll sync, and rendering live here. Key computed properties: `timeRange`, `hourMarkers`, `eventBars`, `rowLayouts`, `sectionBands`.
- `src/App.vue` — Thin root: applies dark-mode class from store, mounts `HourlyTimestrip`.

### Header options (driven by the `.mw` file header)

The Gantt behavior is heavily configurable via header options parsed from the Markwhen input. Relevant ones when modifying rendering: `scale` (hourWidth, default 60px), `laneHeight` (default 20px), `hours` (visible day range), `skipHours`/`skipDates` (excluded time), and various padding/opacity knobs. See `headerOptions` computed in `HourlyTimestrip.vue`.

### Time math

`visibleMinutesBetween()` is the core time function — it computes actual visible duration between two dates after subtracting skipped hours and dates. Any change to how bars are positioned or sized goes through this logic. Validate against varied timelines (different skip configs) before merging.

### Styling

Scoped CSS per component. Dark mode toggled via a `.dark` class on the root. Tailwind is available (`@tailwind` directives in `main.css`) but most component styling is plain scoped CSS. Light/dark variants are defined in the same style block.

## Conventions (from AGENTS.md)

- `<script setup lang="ts">` everywhere. Two-space indent. Imports: packages first, then local.
- Vue component files: `PascalCase`. Stores/composables: `camelCase`, colocated in feature folders.
- Prefer computed props and pure functions over ad-hoc mutations. Mutate shared state through the Pinia store.
- Keep per-frame allocations out of the rendering path; debounce expensive recomputations in watchers.
- Commits: short, focused messages. Include repro steps or screenshots for UI changes.
