import { useEffect, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'fitness-tracker-workouts'

function loadWorkouts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function emptyForm() {
  return {
    exercise: '',
    sets: '',
    reps: '',
    weight: '',
    date: new Date().toISOString().slice(0, 10),
  }
}

function App() {
  const [workouts, setWorkouts] = useState(loadWorkouts)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts))
  }, [workouts])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.exercise.trim()) return

    const entry = {
      id: crypto.randomUUID(),
      exercise: form.exercise.trim(),
      sets: Number(form.sets) || 0,
      reps: Number(form.reps) || 0,
      weight: Number(form.weight) || 0,
      date: form.date,
    }
    setWorkouts((w) => [entry, ...w])
    setForm(emptyForm())
  }

  function handleDelete(id) {
    setWorkouts((w) => w.filter((entry) => entry.id !== id))
  }

  const totalVolume = workouts.reduce(
    (sum, w) => sum + w.sets * w.reps * w.weight,
    0,
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1>Fitness Tracker</h1>
        <p className="subtitle">Log your workouts and track progress</p>
      </header>

      <section className="stats">
        <div className="stat-card">
          <span className="stat-value">{workouts.length}</span>
          <span className="stat-label">Logged sets</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalVolume.toLocaleString()}</span>
          <span className="stat-label">Total volume (lb)</span>
        </div>
      </section>

      <form className="workout-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="exercise">Exercise</label>
          <input
            id="exercise"
            name="exercise"
            type="text"
            placeholder="e.g. Bench Press"
            value={form.exercise}
            onChange={handleChange}
            required
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="sets">Sets</label>
            <input
              id="sets"
              name="sets"
              type="number"
              min="0"
              value={form.sets}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label htmlFor="reps">Reps</label>
            <input
              id="reps"
              name="reps"
              type="number"
              min="0"
              value={form.reps}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label htmlFor="weight">Weight (lb)</label>
            <input
              id="weight"
              name="weight"
              type="number"
              min="0"
              value={form.weight}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
            />
          </div>
        </div>
        <button type="submit">Add workout</button>
      </form>

      <section className="workout-list">
        {workouts.length === 0 ? (
          <p className="empty">No workouts logged yet. Add your first one above.</p>
        ) : (
          <ul>
            {workouts.map((w) => (
              <li key={w.id} className="workout-item">
                <div className="workout-info">
                  <span className="workout-exercise">{w.exercise}</span>
                  <span className="workout-detail">
                    {w.sets} sets × {w.reps} reps @ {w.weight} lb
                  </span>
                  <span className="workout-date">{w.date}</span>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(w.id)}
                  aria-label={`Delete ${w.exercise}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
