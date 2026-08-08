import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3'
import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import * as schema from '../database/schema'

// D1 的 drizzle client 是 async 介面（.all()/.get()/.run() 回傳 Promise），
// better-sqlite3 的是 sync 介面。專案裡所有地方都用 await 呼叫，在 sync driver 上
// await 一個非 Promise 值等同直接取值，執行結果一樣正確；這裡把回傳型別統一標成
// D1（async）的型別，純粹是為了讓 TypeScript 能在雙 driver 情境下正常做型別推導。
export type DB = DrizzleD1Database<typeof schema>

export function isCloudflareWorker() {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'
}

// 只有本機 `nuxt dev` / `nuxt build` (Node) 才會走到這裡；部署到 Cloudflare Worker 時
// 一定會有 D1 binding，這段本機專用的程式碼永遠不會被呼叫到。
let localSqlite: import('better-sqlite3').Database | undefined
let localDb: ReturnType<typeof drizzleSqlite> | undefined

function getLocalSqlite() {
  if (!localSqlite) {
    mkdirSync('.data', { recursive: true })
    const sqlite = new Database('.data/dev.sqlite')
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    localSqlite = sqlite
  }
  return localSqlite
}

function getLocalDb() {
  if (!localDb) {
    localDb = drizzleSqlite(getLocalSqlite(), { schema })
  }
  return localDb
}

interface CloudflareEventContext {
  context?: { cloudflare?: { env?: { DB?: import('@cloudflare/workers-types').D1Database } } }
}

export function getDB(event?: H3Event): DB {
  const d1 = (event as unknown as CloudflareEventContext)?.context?.cloudflare?.env?.DB
  if (d1) return drizzleD1(d1, { schema })
  return getLocalDb() as unknown as DB
}

export function ensureSchema() {
  getLocalSqlite().exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS content_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS content_snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
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
