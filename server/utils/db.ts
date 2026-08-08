import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'node:fs'
import * as schema from '../database/schema'

mkdirSync('.data', { recursive: true })

const sqlite = new Database('.data/dev.sqlite')
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

export function ensureSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      days INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      is_featured INTEGER NOT NULL DEFAULT 0,
      rank INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      departure_date TEXT NOT NULL,
      return_date TEXT NOT NULL,
      flight_info TEXT,
      meeting_point TEXT,
      price_info TEXT,
      group_size INTEGER,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trip_tags (
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      r2_key TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS trip_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
      is_cover INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS hero_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      image_url TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS contact_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      interested_trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );
  `)
}
