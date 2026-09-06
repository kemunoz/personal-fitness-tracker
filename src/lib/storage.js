// Workouts logged before accounts existed, still sitting in this browser.
// The app reads from the API now; these keys exist so that data can be
// carried into an account instead of being stranded.
const STORAGE_KEY = 'fitness-tracker-workouts'
const UNIT_KEY = 'fitness-tracker-unit'
const MIGRATED_KEY = 'fitness-tracker-migrated'

function normalize(entry) {
  return {
    id: entry.id || crypto.randomUUID(),
    date: entry.date || '',
    session: entry.session || '',
    exercise: entry.exercise || '',
    sets: Number(entry.sets) || 0,
    reps: Number(entry.reps) || 0,
    weight: Number(entry.weight) || 0,
    unit: entry.unit || 'lb',
    bodyweight: Boolean(entry.bodyweight),
    durationMin: Number(entry.durationMin) || 0,
    distance: Number(entry.distance) || 0,
    distanceUnit: entry.distanceUnit || '',
    notes: entry.notes || '',
    raw: entry.raw || '',
  }
}

export function loadWorkouts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(normalize) : []
  } catch {
    return []
  }
}

/** The default unit chosen before accounts existed. */
export function loadUnit() {
  try {
    return localStorage.getItem(UNIT_KEY) === 'kg' ? 'kg' : 'lb'
  } catch {
    return 'lb'
  }
}

/** Whether these entries have already been carried into an account. */
export function hasMigrated() {
  try {
    return localStorage.getItem(MIGRATED_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Record that the entries reached an account. The entries themselves are
 * deliberately left in place, so a failed import is still recoverable.
 */
export function markMigrated() {
  try {
    localStorage.setItem(MIGRATED_KEY, 'true')
  } catch {
    /* storage unavailable; the prompt reappears next visit, which is harmless */
  }
}

export { normalize }
