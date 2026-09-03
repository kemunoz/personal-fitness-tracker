import { useMemo } from 'react'
import { volumeOf, toISO } from '../lib/parseWorkout.js'

export default function Stats({ workouts }) {
  const stats = useMemo(() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const cutoff = toISO(weekAgo)

    let totalVolume = 0
    let weekVolume = 0
    let totalSets = 0
    const dates = new Set()

    for (const entry of workouts) {
      const volume = volumeOf(entry)
      totalVolume += volume
      if (entry.date >= cutoff) weekVolume += volume
      totalSets += entry.sets || 0
      dates.add(entry.date)
    }

    return { totalVolume, weekVolume, totalSets, sessions: dates.size }
  }, [workouts])

  const cards = [
    { label: 'Sessions', value: stats.sessions.toLocaleString() },
    { label: 'Sets logged', value: stats.totalSets.toLocaleString() },
    { label: 'Total volume', value: Math.round(stats.totalVolume).toLocaleString() },
    { label: 'Volume, last 7 days', value: Math.round(stats.weekVolume).toLocaleString() },
  ]

  return (
    <section className="stats">
      {cards.map((card) => (
        <div className="stat-card" key={card.label}>
          <span className="stat-value">{card.value}</span>
          <span className="stat-label">{card.label}</span>
        </div>
      ))}
    </section>
  )
}
