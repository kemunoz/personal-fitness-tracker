import { useState } from 'react'

/**
 * Offers to carry workouts logged before accounts existed into the account the
 * user just signed in to. Entries keep their original ids, so the server's
 * INSERT OR IGNORE makes a repeated import a no-op rather than a duplicate.
 */
export default function MigrateBanner({ count, onMigrate, onDismiss }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleMigrate() {
    setError('')
    setBusy(true)
    try {
      await onMigrate()
    } catch {
      setError("Couldn't add them. Your workouts are still saved in this browser — try again.")
      setBusy(false)
    }
  }

  const entries = count === 1 ? 'workout' : 'workouts'

  return (
    <section className="migrate-banner">
      <div className="migrate-copy">
        <h2>
          {count} {entries} saved in this browser
        </h2>
        <p>
          These were logged before accounts existed. Add them to your account to see them
          on your other devices.
        </p>
        {error && (
          <p className="migrate-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="migrate-actions">
        <button type="button" className="primary" onClick={handleMigrate} disabled={busy}>
          {busy ? 'Adding...' : `Add ${count} ${entries}`}
        </button>
        <button type="button" className="ghost" onClick={onDismiss} disabled={busy}>
          Not now
        </button>
      </div>
    </section>
  )
}
