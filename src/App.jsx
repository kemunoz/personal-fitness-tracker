import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import PasteImport from './components/PasteImport.jsx'
import History from './components/History.jsx'
import Stats from './components/Stats.jsx'
import ProgressCharts from './components/ProgressCharts.jsx'
import Recommendations from './components/Recommendations.jsx'
import Login from './components/Login.jsx'
import MigrateBanner from './components/MigrateBanner.jsx'
import { normalize, loadWorkouts, loadUnit, hasMigrated, markMigrated } from './lib/storage.js'
import { downloadCSV, parseCSV } from './lib/csv.js'
import { entryKey } from './lib/format.js'
import {
  isLoggedIn,
  logout,
  fetchUser,
  fetchWorkouts,
  saveWorkouts,
  deleteWorkout,
  deleteWorkoutsByDate,
  deleteAllWorkouts,
  updateUnit,
} from './lib/api.js'

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn)
  const [user, setUser] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [unit, setUnit] = useState('lb')
  const [tab, setTab] = useState('log')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  // Pre-account workouts still in this browser, read once on mount.
  const [legacy, setLegacy] = useState(() => (hasMigrated() ? [] : loadWorkouts()))
  const [legacyDismissed, setLegacyDismissed] = useState(false)
  const fileInputRef = useRef(null)

  const loadData = useCallback(async () => {
    try {
      const [u, w] = await Promise.all([fetchUser(), fetchWorkouts()])
      setUser(u)
      setUnit(u.unit || 'lb')
      setWorkouts(w)
    } catch {
      logout()
      setAuthed(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) loadData()
    else setLoading(false)
  }, [authed, loadData])

  useEffect(() => {
    if (!status) return undefined
    const timer = setTimeout(() => setStatus(''), 4000)
    return () => clearTimeout(timer)
  }, [status])

  const existingKeys = useMemo(() => new Set(workouts.map(entryKey)), [workouts])

  async function handleUnitChange(newUnit) {
    setUnit(newUnit)
    try {
      await updateUnit(newUnit)
    } catch {
      setStatus("Couldn't save unit preference.")
    }
  }

  async function handleImport(entries) {
    const added = entries.map(normalize)
    try {
      await saveWorkouts(added)
      await loadData()
      setStatus(`Imported ${added.length} ${added.length === 1 ? 'entry' : 'entries'}.`)
      setTab('history')
    } catch {
      setStatus('Failed to save entries.')
    }
  }

  async function handleMigrateLegacy() {
    // Entries keep their original ids, so the server ignores any it already has.
    await saveWorkouts(legacy)
    markMigrated()

    // The old default unit comes across too, so kg users don't land on lb.
    const legacyUnit = loadUnit()
    let unitMoved = false
    if (legacyUnit !== unit) {
      try {
        await updateUnit(legacyUnit)
        unitMoved = true
      } catch {
        /* the workouts landed, and the unit is one tap away in the header */
      }
    }

    setLegacy([])
    await loadData()
    const noun = legacy.length === 1 ? 'workout' : 'workouts'
    setStatus(
      unitMoved
        ? `Added ${legacy.length} ${noun} and set your default unit to ${legacyUnit}.`
        : `Added ${legacy.length} ${noun} from this browser.`,
    )
    setTab('history')
  }

  function handleExport() {
    const ordered = [...workouts].sort((a, b) => a.date.localeCompare(b.date))
    downloadCSV(ordered)
  }

  async function handleImportCSV(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const entries = parseCSV(reader.result)
      if (entries.length === 0) {
        setStatus('No entries found in that CSV.')
        return
      }
      const newEntries = entries.filter((entry) => !existingKeys.has(entryKey(entry)))
      if (newEntries.length === 0) {
        setStatus(`All ${entries.length} entries are already in your log.`)
        return
      }
      try {
        await saveWorkouts(newEntries)
        await loadData()
        setStatus(`Imported ${newEntries.length} of ${entries.length} entries from CSV.`)
      } catch {
        setStatus('Failed to import CSV.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleDeleteEntry(id) {
    try {
      await deleteWorkout(id)
      setWorkouts((prev) => prev.filter((e) => e.id !== id))
    } catch {
      setStatus('Failed to delete entry.')
    }
  }

  async function handleDeleteDay(date) {
    try {
      await deleteWorkoutsByDate(date)
      setWorkouts((prev) => prev.filter((e) => e.date !== date))
    } catch {
      setStatus('Failed to delete day.')
    }
  }

  async function handleClearAll() {
    const ok = window.confirm(
      `Delete all ${workouts.length} entries? This can't be undone — export a CSV first if you want a copy.`,
    )
    if (!ok) return
    try {
      await deleteAllWorkouts()
      setWorkouts([])
      setStatus('All entries deleted.')
    } catch {
      setStatus('Failed to delete entries.')
    }
  }

  function handleLogout() {
    logout()
    setAuthed(false)
    setUser(null)
    setWorkouts([])
  }

  if (!authed) {
    return <Login onAuth={() => setAuthed(true)} />
  }

  if (loading) {
    return (
      <div className="app">
        <p className="empty">Loading...</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Fitness Tracker</h1>
          <p className="subtitle">
            Paste your notes, track your progress, access from anywhere.
          </p>
        </div>
        <div className="header-actions">
          <label className="unit-toggle">
            <span className="field-label">Default unit</span>
            <select value={unit} onChange={(e) => handleUnitChange(e.target.value)}>
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </select>
          </label>
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleImportCSV}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            Import CSV
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleExport}
            disabled={workouts.length === 0}
          >
            Export CSV
          </button>
          <button type="button" className="ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      {legacy.length > 0 && !legacyDismissed && (
        <MigrateBanner
          count={legacy.length}
          onMigrate={handleMigrateLegacy}
          onDismiss={() => setLegacyDismissed(true)}
        />
      )}

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
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stats'}
          className={tab === 'stats' ? 'tab active' : 'tab'}
          onClick={() => setTab('stats')}
        >
          Statistics
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'recs'}
          className={tab === 'recs' ? 'tab active' : 'tab'}
          onClick={() => setTab('recs')}
        >
          Recommendations
        </button>
      </nav>

      {status && <p className="status" role="status">{status}</p>}

      {tab === 'log' && (
        <PasteImport
          unit={unit}
          workouts={workouts}
          existingKeys={existingKeys}
          onImport={handleImport}
        />
      )}
      {tab === 'history' && (
        <History
          workouts={workouts}
          onDeleteEntry={handleDeleteEntry}
          onDeleteDay={handleDeleteDay}
        />
      )}
      {tab === 'stats' && <ProgressCharts workouts={workouts} />}
      {tab === 'recs' && <Recommendations workouts={workouts} unit={unit} />}

      <footer className="app-footer">
        <p>
          Signed in as {user?.email}. Your data is stored on the server and
          accessible from any device.
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
