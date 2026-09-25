# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Front end (repo root):
- **Dev server:** `npm run dev` → http://localhost:5173/personal-fitness-tracker/ (proxies `/api` to `localhost:3001`)
- **Build:** `npm run build` → outputs to `dist/`
- **Lint:** `npm run lint` (oxlint, not ESLint)
- **Preview prod build:** `npm run preview`
- **Deploy:** Automatic via GitHub Actions on push to `main` (GitHub Pages, `VITE_API_URL` injected from the `API_URL` repo variable)

Backend API (`server/`):
- **Dev server:** `cd server && npm run dev` → http://localhost:3001 (sets a throwaway `JWT_SECRET`)
- **Start (prod):** `npm start` — requires `JWT_SECRET` env var, refuses to boot without it
- **Deploy:** `fly deploy` from `server/` (Fly.io app `server-dappled-comet-3917`; SQLite file lives on a Fly volume at `/data/data.db` via `DB_PATH`)

No test framework is configured for either package.

## Architecture

React front end (Vite, plain JSX, no TypeScript) talking to a separate Express + SQLite API. The front end is deployed as static assets to GitHub Pages; the API is deployed as a Docker container to Fly.io with its own persistent volume. Auth is stateless JWT (7-day expiry) issued on login/signup and sent as `Authorization: Bearer <token>` on every API call — the server holds no session state.

Workouts logged before accounts existed still live in browser `localStorage` (see `lib/storage.js`); on sign-in, `MigrateBanner` offers to copy them into the account. That's the only data that still touches `localStorage` directly — everything else round-trips through the API.

### Data flow

```
Paste text → parseWorkoutText() → editable preview table → normalize()
                                                                 ↓
                                              POST /api/workouts (JWT) → SQLite (Fly volume)
                                                                 ↓
                                              GET /api/workouts  →  App.jsx state
                                                                 ↓
                                              History / Stats / Recommendations
```

`App.jsx` is the state hub: holds the `workouts` array, `user`, and `unit` preference, and routes between four tabs (Log, History, Statistics, Recommendations). There's no local `commit()` step — every mutation (`saveWorkouts`, `deleteWorkout`, `deleteWorkoutsByDate`, `deleteAllWorkouts`, `updateUnit` in `lib/api.js`) calls the API directly, then reloads or patches local state from the response.

### Entry shape

Every workout row is normalized to: `{ id, date, session, exercise, sets, reps, weight, unit, bodyweight, durationMin, distance, distanceUnit, notes, raw }`. The `normalize()` function in `storage.js` enforces this shape client-side and generates UUIDs; `server/workouts.js` enforces the same shape server-side (`toEntry()` maps SQLite rows back to it) and persists to the `workouts` table, scoped by `user_id` and keyed by the client-generated UUID (`INSERT OR IGNORE` makes retried saves and the legacy-data migration idempotent).

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

### API (`server/`)

- `server/index.js` — Express app entry, CORS locked to the GitHub Pages origin + `localhost:5173`, mounts `/api/auth` and `/api/workouts`.
- `server/auth.js` — signup/login (bcrypt hash, `SALT_ROUNDS = 10`), JWT issuance/verification, `authenticate` middleware, `GET`/`PATCH /me` for unit preference.
- `server/workouts.js` — CRUD scoped to `req.user.id` from the verified JWT; every route is behind `authenticate`.
- `server/db.js` — `better-sqlite3` connection, schema (`users`, `workouts`), WAL mode, `DB_PATH` env var for the Fly volume path.

- `public/openapi.yaml` — OpenAPI 3.0 spec for the API, rendered as a static Redoc page at `public/api-docs/index.html` (served at `/api-docs/` alongside the front end, no separate hosting). Keep it in sync when routes change.

See [README.md](README.md) for the full API reference table and architecture diagrams.

## Conventions

- **Linter:** oxlint with React hooks plugin (rules-of-hooks: error, only-export-components: warn). Config in `.oxlintrc.json`. Applies to the front end only; `server/` has no lint config.
- **Base path:** Vite `base` is set to `/personal-fitness-tracker/` for GitHub Pages subpath deployment.
- **Styling:** Vanilla CSS with CSS custom properties (light/dark via `prefers-color-scheme`). No component library.
- **Charts:** Recharts for the Statistics tab.
- **Two `package.json`s:** root (front end) and `server/` (API) have separate dependencies and must be `npm install`ed independently.
