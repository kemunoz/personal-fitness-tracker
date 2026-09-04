# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm run dev` → http://localhost:5173/personal-fitness-tracker/
- **Build:** `npm run build` → outputs to `dist/`
- **Lint:** `npm run lint` (oxlint, not ESLint)
- **Preview prod build:** `npm run preview`
- **Deploy:** Automatic via GitHub Actions on push to `main` (GitHub Pages)

No test framework is configured.

## Architecture

Front-end-only React app (Vite, plain JSX, no TypeScript). All data lives in browser `localStorage` — no server, no network calls.

### Data flow

```
Paste text → parseWorkoutText() → editable preview table → normalize() → commit() → localStorage
                                                                            ↓
                                                              Stats / History / Charts
```

`App.jsx` is the state hub: holds the `workouts` array and `unit` preference, routes between three tabs (Log, History, Statistics). Every mutation goes through `commit()`, which writes to state and localStorage in one step.

### Entry shape

Every workout row is normalized to: `{ id, date, session, exercise, sets, reps, weight, unit, bodyweight, durationMin, distance, distanceUnit, notes, raw }`. The `normalize()` function in `storage.js` enforces this shape and generates UUIDs.

### Parsing pipeline (`lib/parseWorkout.js`)

This is the core of the app. `parseWorkoutText()` splits free-form text into structured entries using context-tracking (current date, session, exercise carry forward across lines). Key heuristics:
- Leading number > 12 → weight; ≤ 12 → set count
- `"BW"` → bodyweight flag
- Bare `m` < 100 → minutes; ≥ 100 → meters
- Parenthesized text → notes; unmatched words also become notes
- `parseDateLine()` handles ISO, M/D, month names, weekday, "today"/"yesterday"

### Duplicate detection

`entryKey()` in `lib/format.js` produces a string key from `date|exercise|sets|reps|weight|duration|distance`. Used by both paste-import and CSV-import to skip already-logged entries.

### CSV round-trip

Export (`toCSV`/`downloadCSV`) writes 13 columns with a UTF-8 BOM. Import (`parseCSV`) reads them back, handling quoted fields and mapping `"BW"` weight values to `bodyweight: true`.

## Conventions

- **Linter:** oxlint with React hooks plugin (rules-of-hooks: error, only-export-components: warn). Config in `.oxlintrc.json`.
- **Base path:** Vite `base` is set to `/personal-fitness-tracker/` for GitHub Pages subpath deployment.
- **Styling:** Vanilla CSS with CSS custom properties (light/dark via `prefers-color-scheme`). No component library.
- **Charts:** Recharts for the Statistics tab.
