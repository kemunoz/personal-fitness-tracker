import { useMemo, useState } from 'react'
import { describeEntry, formatDate } from '../lib/format.js'

/**
 * Past workouts grouped into days, most recent first — the same grouping the
 * History tab shows, so what you pick here looks like what you saw there.
 */
function groupDays(workouts) {
  const byDate = new Map()
  for (const entry of workouts) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, [])
    byDate.get(entry.date).push(entry)
  }
  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, entries]) => ({
      date,
      entries,
      session: entries.find((e) => e.session)?.session || '',
    }))
}

function label(day) {
  const noun = day.entries.length === 1 ? 'entry' : 'entries'
  return [
    formatDate(day.date),
    day.session && `— ${day.session}`,
    `(${day.entries.length} ${noun})`,
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Pick a day you already logged and drop its exercises into the preview table
 * below, dated today. Nothing is saved until the usual Import button.
 */
export default function CopyPrevious({ workouts, onCopy }) {
  const days = useMemo(() => groupDays(workouts), [workouts])
  const [picked, setPicked] = useState('')

  if (days.length === 0) return null

  const day = days.find((d) => d.date === picked) || days[0]

  return (
    <section className="copy-previous">
      <header className="copy-previous-header">
        <h2>Repeat a previous workout</h2>
        <p className="hint">
          Load a day you already logged, adjust the numbers, then import it as
          today&apos;s session.
        </p>
      </header>

      <div className="copy-previous-controls">
        <label className="field inline">
          <span className="field-label">Workout to copy</span>
          <select value={day.date} onChange={(e) => setPicked(e.target.value)}>
            {days.map((d) => (
              <option key={d.date} value={d.date}>
                {label(d)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ghost" onClick={() => onCopy(day)}>
          Copy to today
        </button>
      </div>

      <ul className="copy-previous-preview">
        {day.entries.map((entry) => (
          <li key={entry.id}>
            <span className="entry-exercise">{entry.exercise}</span>{' '}
            <span className="entry-detail">{describeEntry(entry)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
