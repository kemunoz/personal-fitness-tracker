import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { volumeOf } from '../lib/parseWorkout.js'

export default function ProgressCharts({ workouts }) {
  const [view, setView] = useState('volume')
  const [selectedExercise, setSelectedExercise] = useState('')

  const exercises = useMemo(() => {
    const names = new Set()
    for (const w of workouts) {
      if (w.exercise && w.weight > 0) names.add(w.exercise)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [workouts])

  // Auto-select first exercise when list changes
  const activeExercise = exercises.includes(selectedExercise)
    ? selectedExercise
    : exercises[0] || ''

  const volumeData = useMemo(() => {
    const byDate = {}
    for (const w of workouts) {
      if (!w.date) continue
      byDate[w.date] = (byDate[w.date] || 0) + volumeOf(w)
    }
    return Object.entries(byDate)
      .map(([date, volume]) => ({ date, volume: Math.round(volume) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [workouts])

  const exerciseData = useMemo(() => {
    if (!activeExercise) return []
    const byDate = {}
    for (const w of workouts) {
      if (w.exercise !== activeExercise || !w.date || !w.weight) continue
      byDate[w.date] = Math.max(byDate[w.date] || 0, w.weight)
    }
    return Object.entries(byDate)
      .map(([date, weight]) => ({ date, weight }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [workouts, activeExercise])

  const chartData = view === 'volume' ? volumeData : exerciseData
  const dataKey = view === 'volume' ? 'volume' : 'weight'
  const label = view === 'volume' ? 'Volume' : 'Weight'
  const minPoints = view === 'volume' ? 2 : 1

  if (workouts.length === 0) {
    return <p className="empty">Log some workouts to see progress charts.</p>
  }

  return (
    <div className="progress-charts">
      <div className="chart-controls">
        <label className="unit-toggle">
          <span className="field-label">View</span>
          <select value={view} onChange={(e) => setView(e.target.value)}>
            <option value="volume">Volume over time</option>
            <option value="exercise">Per-exercise weight</option>
          </select>
        </label>

        {view === 'exercise' && (
          <label className="unit-toggle">
            <span className="field-label">Exercise</span>
            <select
              value={activeExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
            >
              {exercises.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {chartData.length < minPoints ? (
        <p className="empty">
          {view === 'volume'
            ? 'Need at least 2 sessions to chart volume.'
            : 'Log this exercise to see progress.'}
        </p>
      ) : (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'var(--text)' }}
                tickFormatter={(d) => d.slice(5)} // MM-DD
                padding={{ left: 20, right: 20 }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--text)' }}
                width={52}
                domain={
                  chartData.length === 1
                    ? [(dataMin) => Math.max(0, Math.round(dataMin * 0.9)), (dataMax) => Math.round(dataMax * 1.1)]
                    : ['auto', 'auto']
                }
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 14,
                }}
                labelStyle={{ color: 'var(--text-h)' }}
                formatter={(value) => [value.toLocaleString(), label]}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--accent)' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
