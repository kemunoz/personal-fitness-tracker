export function formatDuration(minutes) {
  if (!minutes) return ''
  const totalSeconds = Math.round(minutes * 60)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`
  if (s) return `${m}:${String(s).padStart(2, '0')}`
  return `${m} min`
}

/** The human-readable right-hand side of an entry: "3 × 5  @ 225 lb". */
export function describeEntry(entry) {
  const parts = []
  if (entry.sets && entry.reps) parts.push(`${entry.sets} × ${entry.reps}`)
  else if (entry.reps) parts.push(`${entry.reps} reps`)
  else if (entry.sets && (entry.durationMin || entry.distance)) parts.push(`${entry.sets} ×`)
  else if (entry.sets) parts.push(`${entry.sets} sets`)

  if (entry.weight) parts.push(`@ ${entry.weight} ${entry.unit}`)
  else if (entry.bodyweight) parts.push('@ bodyweight')

  if (entry.distance) parts.push(`${entry.distance} ${entry.distanceUnit}`)
  if (entry.durationMin) parts.push(formatDuration(entry.durationMin))

  return parts.join('  ')
}

export function formatDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Identity of an entry for duplicate detection on re-paste. */
export function entryKey(entry) {
  return [
    entry.date,
    entry.exercise.trim().toLowerCase(),
    entry.sets,
    entry.reps,
    entry.weight,
    entry.durationMin,
    entry.distance,
  ].join('|')
}
