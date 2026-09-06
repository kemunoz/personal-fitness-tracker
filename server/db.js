import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// DB_PATH points at the Fly volume in production; falls back to a file beside
// this module for local development.
const db = new Database(process.env.DB_PATH || join(__dirname, 'data.db'))

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    unit TEXT DEFAULT 'lb',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    session TEXT DEFAULT '',
    exercise TEXT DEFAULT '',
    sets INTEGER DEFAULT 0,
    reps INTEGER DEFAULT 0,
    weight REAL DEFAULT 0,
    unit TEXT DEFAULT 'lb',
    bodyweight INTEGER DEFAULT 0,
    duration_min REAL DEFAULT 0,
    distance REAL DEFAULT 0,
    distance_unit TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    raw TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
`)

export default db
