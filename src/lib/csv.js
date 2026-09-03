import { volumeOf } from './parseWorkout.js'

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
