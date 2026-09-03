import { useEffect, useMemo, useState } from 'react'
import './App.css'
import PasteImport from './components/PasteImport.jsx'
import History from './components/History.jsx'
import Stats from './components/Stats.jsx'
import { loadWorkouts, saveWorkouts, loadUnit, saveUnit, normalize } from './lib/storage.js'
import { downloadCSV } from './lib/csv.js'
import { entryKey } from './lib/format.js'

export default function App() {
  const [workouts, setWorkouts] = useState(loadWorkouts)
  const [unit, setUnit] = useState(loadUnit)
  const [tab, setTab] = useState('log')
  const [status, setStatus] = useState('')

  useEffect(() => saveUnit(unit), [unit])

  useEffect(() => {
    if (!status) return undefined
    const timer = setTimeout(() => setStatus(''), 4000)
    return () => clearTimeout(timer)
  }, [status])

  const existingKeys = useMemo(() => new Set(workouts.map(entryKey)), [workouts])

  // Every change writes through to localStorage right away, so a lost tab
  // never costs more than the edit in progress.
  function commit(next, message) {
    setWorkouts(next)
    if (saveWorkouts(next)) setStatus(message || '')
    else setStatus("Couldn't save to this browser's storage — export a CSV to be safe.")
  }

  function handleImport(entries) {
    const added = entries.map(normalize)
    const next = [...workouts, ...added].sort((a, b) => b.date.localeCompare(a.date))
    commit(next, `Imported ${added.length} ${added.length === 1 ? 'entry' : 'entries'}.`)
    setTab('history')
  }

  function handleExport() {
    const ordered = [...workouts].sort((a, b) => a.date.localeCompare(b.date))
    downloadCSV(ordered)
  }

  function handleClearAll() {
    const ok = window.confirm(
      `Delete all ${workouts.length} entries? This can't be undone — export a CSV first if you want a copy.`,
    )
    if (ok) commit([], 'All entries deleted.')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Fitness Tracker</h1>
          <p className="subtitle">
            Paste your notes, keep the data on this device, export it whenever.
          </p>
        </div>
        <div className="header-actions">
          <label className="unit-toggle">
            <span className="field-label">Default unit</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </select>
          </label>
          <button
            type="button"
            className="primary"
            onClick={handleExport}
            disabled={workouts.length === 0}
          >
            Export CSV
          </button>
        </div>
      </header>

      <Stats workouts={workouts} />

      <nav className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'log'}
          className={tab === 'log' ? 'tab active' : 'tab'}
          onClick={() => setTab('log')}
        >
          Log a workout
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          className={tab === 'history' ? 'tab active' : 'tab'}
          onClick={() => setTab('history')}
        >
          History{workouts.length > 0 && ` (${workouts.length})`}
        </button>
      </nav>

      {status && <p className="status" role="status">{status}</p>}

      {tab === 'log' ? (
        <PasteImport unit={unit} existingKeys={existingKeys} onImport={handleImport} />
      ) : (
        <History
          workouts={workouts}
          onDeleteEntry={(id) => commit(workouts.filter((e) => e.id !== id))}
          onDeleteDay={(date) => commit(workouts.filter((e) => e.date !== date))}
        />
      )}

      <footer className="app-footer">
        <p>
          Everything you log is stored only in this browser. Clearing site data — or
          using another device — starts from empty, so export a CSV to keep a copy.
        </p>
        {workouts.length > 0 && (
          <button type="button" className="ghost danger" onClick={handleClearAll}>
            Delete all data
          </button>
        )}
      </footer>
    </div>
  )
}
