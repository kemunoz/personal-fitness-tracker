import { useMemo, useState } from 'react'
import { volumeOf } from '../lib/parseWorkout.js'
import { describeEntry, formatDate } from '../lib/format.js'

export default function History({ workouts, onDeleteEntry, onDeleteDay }) {
  const [filter, setFilter] = useState('')

  const days = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    const matched = needle
      ? workouts.filter(
          (w) =>
            w.exercise.toLowerCase().includes(needle) ||
            w.session.toLowerCase().includes(needle),
        )
      : workouts

    const byDate = new Map()
    for (const entry of matched) {
      if (!byDate.has(entry.date)) byDate.set(entry.date, [])
      byDate.get(entry.date).push(entry)
    }
    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, entries]) => ({
        date,
        entries,
        session: entries.find((e) => e.session)?.session || '',
        volume: entries.reduce((sum, e) => sum + volumeOf(e), 0),
      }))
  }, [workouts, filter])

  if (workouts.length === 0) {
    return (
      <p className="empty">
        No workouts yet. Paste your notes on the Log tab to get started.
      </p>
    )
  }

  return (
    <div className="history">
      <input
        type="search"
        className="filter"
        placeholder="Filter by exercise or session"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {days.length === 0 && <p className="empty">Nothing matches “{filter}”.</p>}

      {days.map((day) => (
        <section className="day" key={day.date}>
          <header className="day-header">
            <div>
              <h2>{formatDate(day.date)}</h2>
              <p className="day-meta">
                {day.session && <span className="session-tag">{day.session}</span>}
                {day.entries.length} {day.entries.length === 1 ? 'entry' : 'entries'}
                {day.volume > 0 && ` · ${Math.round(day.volume).toLocaleString()} volume`}
              </p>
            </div>
            <button
              type="button"
              className="ghost"
              onClick={() => onDeleteDay(day.date)}
              aria-label={`Delete all entries for ${formatDate(day.date)}`}
            >
              Delete day
            </button>
          </header>

          <ul className="entry-list">
            {day.entries.map((entry) => (
              <li className="entry" key={entry.id}>
                <div className="entry-main">
                  <span className="entry-exercise">{entry.exercise}</span>
                  <span className="entry-detail">{describeEntry(entry)}</span>
                  {entry.notes && <span className="entry-note">{entry.notes}</span>}
                </div>
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => onDeleteEntry(entry.id)}
                  aria-label={`Delete ${entry.exercise}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
