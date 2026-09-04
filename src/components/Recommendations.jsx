import { useMemo } from 'react'
import { recommend } from '../lib/progression.js'
import { formatDate } from '../lib/format.js'

export default function Recommendations({ workouts, unit }) {
  const sessions = useMemo(() => {
    // Group by session name → find most recent date → collect exercises from that date
    const bySession = {}
    for (const w of workouts) {
      const session = w.session || 'General'
      if (!bySession[session]) bySession[session] = []
      bySession[session].push(w)
    }

    const result = []
    for (const [session, entries] of Object.entries(bySession)) {
      // Find the most recent date for this session
      const latestDate = entries.reduce(
        (max, e) => (e.date > max ? e.date : max),
        '',
      )
      if (!latestDate) continue

      // Get all entries from that date
      const dayEntries = entries.filter((e) => e.date === latestDate)

      // Group by exercise, preserving order of first appearance
      const exerciseOrder = []
      const byExercise = {}
      for (const e of dayEntries) {
        if (!e.exercise) continue
        if (!byExercise[e.exercise]) {
          byExercise[e.exercise] = []
          exerciseOrder.push(e.exercise)
        }
        byExercise[e.exercise].push(e)
      }

      const exercises = exerciseOrder.map((name) => {
        const sets = byExercise[name]
        const totalSets = sets.reduce((sum, e) => sum + (e.sets || 1), 0)
        const maxWeight = Math.max(...sets.map((e) => e.weight || 0))
        const reps = sets[0]?.reps || 0
        const isBW = sets.some((e) => e.bodyweight) && maxWeight === 0
        const rec = recommend(sets, unit)

        return { name, sets, totalSets, reps, maxWeight, isBW, rec }
      })

      result.push({ session, date: latestDate, exercises })
    }

    // Sort by most recent date first
    result.sort((a, b) => b.date.localeCompare(a.date))
    return result
  }, [workouts, unit])

  if (workouts.length === 0) {
    return <p className="empty">Log some workouts to get recommendations.</p>
  }

  if (sessions.length === 0) {
    return <p className="empty">No exercises found to make recommendations.</p>
  }

  return (
    <div className="recommendations">
      {sessions.map(({ session, date, exercises }) => (
        <div className="day" key={session}>
          <div className="day-header">
            <div>
              <h2>{session}</h2>
              <span className="day-meta">last done {formatDate(date)}</span>
            </div>
          </div>
          <ul className="entry-list">
            {exercises.map(({ name, totalSets, reps, maxWeight, isBW, rec }) => (
              <li className="entry" key={name}>
                <div className="entry-main">
                  <span className="entry-exercise">{name}</span>
                  <span className="entry-detail">
                    {isBW
                      ? `${totalSets}×${reps} @ BW`
                      : maxWeight > 0
                        ? `${totalSets}×${reps} @ ${maxWeight} ${unit}`
                        : `${totalSets}×${reps}`}
                  </span>
                </div>
                <span className={rec ? (rec.didProgress ? 'rec-increase' : 'rec-stay') : 'rec-skip'}>
                  {rec ? rec.message : 'bodyweight — no suggestion'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
