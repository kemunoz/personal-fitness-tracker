// All data lives in this browser. Nothing is sent anywhere.
const STORAGE_KEY = 'fitness-tracker-workouts'
const UNIT_KEY = 'fitness-tracker-unit'

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

export function saveWorkouts(workouts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts))
    return true
  } catch {
    return false
  }
}

export function loadUnit() {
  try {
    return localStorage.getItem(UNIT_KEY) === 'kg' ? 'kg' : 'lb'
  } catch {
    return 'lb'
  }
}

export function saveUnit(unit) {
  try {
    localStorage.setItem(UNIT_KEY, unit)
  } catch {
    /* storage unavailable; the app still works for this session */
  }
}

export { normalize }
