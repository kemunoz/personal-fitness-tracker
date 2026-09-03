# Personal Fitness Tracker

A front-end-only workout log. You keep writing workouts in your notes app the way
you already do, then paste them in — the app parses the free text into structured
entries, stores them in this browser, and exports everything to CSV.

No account, no server, no network calls. All data lives in `localStorage`.

## Running it

```sh
npm install
npm run dev      # http://localhost:5173/personal-fitness-tracker/
npm run build    # production build into dist/
npm run lint
```

## How the paste box works

Paste notes, check the preview table, fix anything misread, import. The preview is
editable, so a wrong guess is a two-second correction rather than a re-type.

Recognized shapes:

| In your notes | Read as |
| --- | --- |
| `2026-09-02`, `9/2`, `Sept 2`, `Mon 9/2 — Push day`, `Today` | starts a new day |
| an exercise name alone on a line | applies to the set lines beneath it |
| `135 x 8` | weight × reps |
| `3x5`, `3x5 @ 225`, `3 sets of 12 reps @ 50 lb` | sets × reps @ weight |
| `135x8x3` | weight × reps × sets |
| `BW x 12`, `Dips BW x 12 x 3` | bodyweight sets |
| `225x5, 245x5, 265x3` | three separate sets |
| `3mi 24:30`, `30 min`, `5000m`, `Plank 3 x 45s` | distance and duration |
| `(felt heavy)` | a note on that set |

Two deliberate guesses, both visible in the preview:

- A leading number **over 12** is treated as weight, **12 or under** as a set count —
  so `135 x 8` is 135 lb for 8 reps, while `3 x 8` is 3 sets of 8.
- Where the weight sits decides the rest: `135 lb x 8 x 3` counts down from the
  weight (reps, then sets), while `3 x 8 @ 135` leads with the sets.

A bare `m` is minutes under 100 (`30m`) and meters at or above it (`5000m`).

Every entry keeps its original line, exported in the CSV's `Original Line` column,
so nothing you wrote is lost even if a guess was wrong.

## Export

**Export CSV** downloads every entry sorted oldest-first, with a UTF-8 BOM so Excel
opens it cleanly. Columns: date, session, exercise, sets, reps, weight, unit, volume,
duration, distance, notes, and the original line.

Since the data only lives in this browser, clearing site data or switching devices
starts from empty — export a CSV if you want a durable copy.

## Layout

```
src/
  lib/parseWorkout.js   free-text notes -> structured entries
  lib/csv.js            CSV serialization and download
  lib/storage.js        localStorage read/write
  lib/format.js         display helpers
  components/           PasteImport, History, Stats
```
