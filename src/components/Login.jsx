import { useState } from 'react'
import { login, signup } from '../lib/api.js'
import { loadWorkouts } from '../lib/storage.js'
import { downloadCSV } from '../lib/csv.js'

export default function Login({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Workouts logged before accounts existed. Reachable without signing in, so
  // nobody's data is stuck behind an account they never had.
  const [local] = useState(loadWorkouts)

  function handleExportLocal() {
    const ordered = [...local].sort((a, b) => a.date.localeCompare(b.date))
    downloadCSV(ordered, `workouts-from-this-browser-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signup(email, password)
      } else {
        await login(email, password)
      }
      onAuth()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const revealLabel = showPassword ? 'Hide' : 'Show'

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Fitness Tracker</h1>
        <p className="subtitle">
          {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'signup' ? 6 : undefined}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="link-btn reveal-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {revealLabel}
              </button>
            </div>
          </label>
          {mode === 'signup' && (
            <label className="field">
              <span className="field-label">Confirm password</span>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="link-btn reveal-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {revealLabel}
                </button>
              </div>
            </label>
          )}

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="login-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('')
              setConfirm('')
              setShowPassword(false)
            }}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>

        {local.length > 0 && (
          <p className="login-local">
            {local.length} {local.length === 1 ? 'workout' : 'workouts'} saved in this browser,
            from before accounts existed. Sign in and you can add {local.length === 1 ? 'it' : 'them'} to
            your account, or{' '}
            <button type="button" className="link-btn" onClick={handleExportLocal}>
              download a CSV
            </button>{' '}
            first.
          </p>
        )}
      </div>
    </div>
  )
}
