import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from './db.js'

const router = Router()
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const SALT_ROUNDS = 10

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '30d' })
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  try {
    const payload = jwt.verify(header.slice(7), SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

router.post('/signup', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' })
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(
    email.toLowerCase(),
    hash,
  )
  const user = { id: result.lastInsertRowid, email: email.toLowerCase() }
  res.status(201).json({ token: signToken(user) })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase())
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  res.json({ token: signToken(user) })
})

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, unit FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

router.patch('/me', authenticate, (req, res) => {
  const { unit } = req.body
  if (unit && (unit === 'lb' || unit === 'kg')) {
    db.prepare('UPDATE users SET unit = ? WHERE id = ?').run(unit, req.user.id)
  }
  const user = db.prepare('SELECT id, email, unit FROM users WHERE id = ?').get(req.user.id)
  res.json(user)
})

export default router
