import { Router } from 'express'
import { authenticate } from './auth.js'
import db from './db.js'

const router = Router()
router.use(authenticate)

const INSERT = db.prepare(`
  INSERT OR IGNORE INTO workouts
    (id, user_id, date, session, exercise, sets, reps, weight, unit, bodyweight, duration_min, distance, distance_unit, notes, raw)
  VALUES
    (@id, @user_id, @date, @session, @exercise, @sets, @reps, @weight, @unit, @bodyweight, @duration_min, @distance, @distance_unit, @notes, @raw)
`)

const insertMany = db.transaction((entries, userId) => {
  let added = 0
  for (const e of entries) {
    const result = INSERT.run({
      id: e.id || crypto.randomUUID(),
      user_id: userId,
      date: e.date || '',
      session: e.session || '',
      exercise: e.exercise || '',
      sets: Number(e.sets) || 0,
      reps: Number(e.reps) || 0,
      weight: Number(e.weight) || 0,
      unit: e.unit || 'lb',
      bodyweight: e.bodyweight ? 1 : 0,
      duration_min: Number(e.durationMin) || 0,
      distance: Number(e.distance) || 0,
      distance_unit: e.distanceUnit || '',
      notes: e.notes || '',
      raw: e.raw || '',
    })
    if (result.changes > 0) added++
  }
  return added
})

// Get all workouts for the authenticated user
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC')
    .all(req.user.id)
  res.json(rows.map(toEntry))
})

// Add workouts
router.post('/', (req, res) => {
  const entries = req.body
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'Expected a non-empty array of entries' })
  }
  const added = insertMany(entries, req.user.id)
  res.status(201).json({ added })
})

// Delete a single workout by id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
  res.json({ ok: true })
})

// Delete by date or all
router.delete('/', (req, res) => {
  if (req.query.date) {
    const result = db
      .prepare('DELETE FROM workouts WHERE user_id = ? AND date = ?')
      .run(req.user.id, req.query.date)
    return res.json({ deleted: result.changes })
  }
  if (req.query.all === 'true') {
    const result = db.prepare('DELETE FROM workouts WHERE user_id = ?').run(req.user.id)
    return res.json({ deleted: result.changes })
  }
  res.status(400).json({ error: 'Specify ?date=YYYY-MM-DD or ?all=true' })
})

/** Map a database row back to the frontend entry shape. */
function toEntry(row) {
  return {
    id: row.id,
    date: row.date,
    session: row.session,
    exercise: row.exercise,
    sets: row.sets,
    reps: row.reps,
    weight: row.weight,
    unit: row.unit,
    bodyweight: Boolean(row.bodyweight),
    durationMin: row.duration_min,
    distance: row.distance,
    distanceUnit: row.distance_unit,
    notes: row.notes,
    raw: row.raw,
  }
}

export default router
