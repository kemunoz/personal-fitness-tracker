import { useMemo, useState } from 'react'
import { parseWorkoutText, toISO } from '../lib/parseWorkout.js'
import { entryKey } from '../lib/format.js'

const PLACEHOLDER = `Paste straight from your notes app, e.g.

Sep 1 — Push day
Bench press
135 x 8
135 x 8
145 x 6

Overhead press 3x10 @ 95
Dips BW x 12 x 3`

export default function PasteImport({ unit, existingKeys, onImport }) {
  const [text, setText] = useState('')
  const [fallbackDate, setFallbackDate] = useState(() => toISO(new Date()))
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [edits, setEdits] = useState({})

  const parsed = useMemo(
    () => parseWorkoutText(text, { date: fallbackDate, unit }),
    [text, fallbackDate, unit],
  )

  // Editing the pasted text re-parses from scratch and drops any hand-edits,
  // which is what you want: the text stays the source of truth.
  const [lastParsed, setLastParsed] = useState(parsed)
  if (lastParsed !== parsed) {
    setLastParsed(parsed)
    setEdits({})
  }

  const draft = parsed.map((entry, i) => ({ ...entry, key: i, keep: true, ...edits[i] }))
  const kept = draft.filter((row) => row.keep)
  const duplicates = kept.filter((row) => existingKeys.has(entryKey(row)))
  const toImport = skipDuplicates
    ? kept.filter((row) => !existingKeys.has(entryKey(row)))
    : kept
  const needsReview = kept.filter((row) => row.needsReview)
  const days = new Set(kept.map((row) => row.date)).size

  function update(key, patch) {
    setEdits((current) => ({ ...current, [key]: { ...current[key], ...patch } }))
  }

  function handleImport() {
    if (!toImport.length) return
    onImport(
      toImport.map(({ key: _key, keep: _keep, needsReview: _review, ...entry }) => entry),
    )
    setText('')
  }

  return (
    <div className="paste-import">
      <label className="field">
        <span className="field-label">Paste your workout notes</span>
        <textarea
          className="paste-box"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={12}
          spellCheck={false}
        />
      </label>

      <div className="paste-options">
        <label className="field inline">
          <span className="field-label">Date to use if the notes don&apos;t say</span>
          <input
            type="date"
            value={fallbackDate}
            onChange={(e) => setFallbackDate(e.target.value)}
          />
        </label>
      </div>

      {text.trim() && (
        <section className="preview">
          <header className="preview-header">
            <h2>
              {kept.length} {kept.length === 1 ? 'entry' : 'entries'}
              {days > 1 && ` across ${days} days`}
            </h2>
            <p className="hint">Fix anything the parser misread before importing.</p>
          </header>

          {kept.length === 0 ? (
            <p className="empty">
              Nothing recognizable yet. Lines like <code>Bench 135x8</code> or a name on
              one line with <code>135 x 8</code> under it both work.
            </p>
          ) : (
            <>
              {needsReview.length > 0 && (
                <p className="warning">
                  {needsReview.length} {needsReview.length === 1 ? 'line' : 'lines'} had no
                  numbers to read. Give them values or uncheck them.
                </p>
              )}
              {skipDuplicates && duplicates.length > 0 && (
                <p className="warning">
                  {duplicates.length} already in your log — skipping{' '}
                  {duplicates.length === 1 ? 'it' : 'them'}.
                </p>
              )}

              <div className="table-scroll">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th aria-label="Include" />
                      <th>Date</th>
                      <th>Exercise</th>
                      <th>Sets</th>
                      <th>Reps</th>
                      <th>Weight</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.map((row) => {
                      const isDuplicate = row.keep && existingKeys.has(entryKey(row))
                      return (
                        <tr
                          key={row.key}
                          className={[
                            row.keep ? '' : 'row-off',
                            row.needsReview ? 'row-review' : '',
                            isDuplicate && skipDuplicates ? 'row-duplicate' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={row.keep}
                              onChange={(e) => update(row.key, { keep: e.target.checked })}
                              aria-label={`Include ${row.exercise}`}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={row.date}
                              onChange={(e) => update(row.key, { date: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="cell-exercise"
                              value={row.exercise}
                              onChange={(e) => update(row.key, { exercise: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="cell-num"
                              value={row.sets || ''}
                              onChange={(e) =>
                                update(row.key, { sets: Number(e.target.value) || 0 })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="cell-num"
                              value={row.reps || ''}
                              onChange={(e) =>
                                update(row.key, { reps: Number(e.target.value) || 0 })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="cell-num"
                              placeholder={row.bodyweight ? 'BW' : ''}
                              value={row.weight || ''}
                              onChange={(e) =>
                                update(row.key, {
                                  weight: Number(e.target.value) || 0,
                                  unit: row.unit || unit,
                                })
                              }
                            />
                          </td>
                          <td className="cell-note" title={row.raw}>
                            {row.notes}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="preview-actions">
                <button type="button" className="primary" onClick={handleImport} disabled={!toImport.length}>
                  Import {toImport.length} {toImport.length === 1 ? 'entry' : 'entries'}
                </button>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                  />
                  Skip entries already logged
                </label>
              </div>
            </>
          )}
        </section>
      )}

      <details className="format-help">
        <summary>What the parser understands</summary>
        <ul>
          <li>
            <strong>Dates</strong> on their own line start a new day:{' '}
            <code>2026-09-02</code>, <code>9/2</code>, <code>Sept 2</code>,{' '}
            <code>Mon 9/2 — Push day</code>, <code>Today</code>.
          </li>
          <li>
            <strong>An exercise name on its own line</strong> applies to the set lines
            under it, so <code>Bench press</code> then <code>135 x 8</code> works.
          </li>
          <li>
            <strong>Sets</strong>: <code>135 x 8</code> (weight × reps),{' '}
            <code>3x5</code> (sets × reps), <code>3x5 @ 225</code>,{' '}
            <code>135x8x3</code>, <code>3 sets of 12 reps @ 50 lb</code>,{' '}
            <code>BW x 12</code>.
          </li>
          <li>
            <strong>Several sets on one line</strong>, comma separated:{' '}
            <code>225x5, 245x5, 265x3</code>.
          </li>
          <li>
            <strong>Cardio and holds</strong>: <code>3mi 24:30</code>,{' '}
            <code>30 min</code>, <code>5000m</code>, <code>Plank 3 x 45s</code>.
          </li>
          <li>
            <strong>Anything in parentheses</strong> becomes a note, and the original
            line is always kept in the CSV export.
          </li>
        </ul>
        <p className="hint">
          A leading number over 12 is read as weight, at or under 12 as a set count —
          that&apos;s the one guess worth checking in the preview.
        </p>
      </details>
    </div>
  )
}
