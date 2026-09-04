import { volumeOf } from './parseWorkout.js'
import { normalize } from './storage.js'

const COLUMNS = [
  ['Date', (e) => e.date],
  ['Session', (e) => e.session],
  ['Exercise', (e) => e.exercise],
  ['Sets', (e) => e.sets],
  ['Reps', (e) => e.reps],
  ['Weight', (e) => (e.bodyweight && !e.weight ? 'BW' : e.weight || '')],
  ['Unit', (e) => (e.weight ? e.unit : '')],
  ['Volume', (e) => volumeOf(e) || ''],
  ['Duration (min)', (e) => (e.durationMin ? Math.round(e.durationMin * 100) / 100 : '')],
  ['Distance', (e) => e.distance || ''],
  ['Distance Unit', (e) => (e.distance ? e.distanceUnit : '')],
  ['Notes', (e) => e.notes],
  ['Original Line', (e) => e.raw],
]

function cell(value) {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(entries) {
  const rows = [COLUMNS.map(([header]) => header).join(',')]
  for (const entry of entries) {
    rows.push(COLUMNS.map(([, get]) => cell(get(entry))).join(','))
  }
  return rows.join('\n')
}

/** Parse a CSV row respecting quoted fields. */
function parseRow(line) {
  const cells = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) { cells.push(''); break }
    if (line[i] === '"') {
      let val = ''
      i++ // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else { val += line[i]; i++ }
      }
      cells.push(val)
      if (line[i] === ',') i++ // skip delimiter
    } else {
      const next = line.indexOf(',', i)
      if (next === -1) { cells.push(line.slice(i)); break }
      cells.push(line.slice(i, next))
      i = next + 1
    }
  }
  return cells
}

export function parseCSV(text) {
  // Strip BOM if present
  const clean = text.replace(/^\uFEFF/, '')
  const lines = clean.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseRow(lines[0])
  const col = (name) => headers.indexOf(name)

  const entries = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i])
    if (cells.every((c) => !c.trim())) continue

    const weightRaw = cells[col('Weight')] || ''
    const isBW = weightRaw.trim().toUpperCase() === 'BW'

    entries.push(
      normalize({
        date: cells[col('Date')] || '',
        session: cells[col('Session')] || '',
        exercise: cells[col('Exercise')] || '',
        sets: Number(cells[col('Sets')]) || 0,
        reps: Number(cells[col('Reps')]) || 0,
        weight: isBW ? 0 : Number(weightRaw) || 0,
        unit: cells[col('Unit')] || 'lb',
        bodyweight: isBW,
        durationMin: Number(cells[col('Duration (min)')]) || 0,
        distance: Number(cells[col('Distance')]) || 0,
        distanceUnit: cells[col('Distance Unit')] || '',
        notes: cells[col('Notes')] || '',
        raw: cells[col('Original Line')] || '',
      }),
    )
  }
  return entries
}

export function downloadCSV(entries, filename) {
  // The BOM keeps Excel from mangling the file on open.
  const blob = new Blob(['﻿', toCSV(entries)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `workouts-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
