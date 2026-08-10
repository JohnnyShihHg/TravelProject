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

// CREATE TABLE IF NOT EXISTS 不會替既有資料表補上新欄位，所以之後加的欄位要在這裡補一次。
// 正式環境（D1）走 server/database/migrations 的 SQL 檔，兩邊要保持一致。
function addColumnIfMissing(
  sqlite: import('better-sqlite3').Database,
  table: string,
  column: string,
  definition: string
) {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!columns.some(c => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

// 對應 migrations/0003：把舊的 tags（category=location/attraction/type）拆成
// destinations / spots / tags。既有的本機 dev.sqlite 會就地升級，不需要刪掉 .data/ 重來。
function migrateLegacyTagsSchema(sqlite: import('better-sqlite3').Database) {
  const tagColumns = sqlite.prepare('PRAGMA table_info(tags)').all() as { name: string }[]
  if (!tagColumns.some(c => c.name === 'category')) return // 已經是新結構

  const destSlugs: Record<string, { slug: string, type: 'country' | 'city', parent?: string, domestic?: boolean }> = {
    日本: { slug: 'japan', type: 'country' },
    韓國: { slug: 'korea', type: 'country' },
    台灣: { slug: 'taiwan', type: 'country', domestic: true },
    東京: { slug: 'tokyo', type: 'city', parent: '日本' },
    京都: { slug: 'kyoto', type: 'city', parent: '日本' },
    北海道: { slug: 'hokkaido', type: 'city', parent: '日本' }
  }
  const spotSlugs: Record<string, { slug: string, destination?: string }> = {
    富士山: { slug: 'mount-fuji', destination: '日本' }, // 實際不在東京都內
    清水寺: { slug: 'kiyomizu-dera', destination: '京都' },
    101: { slug: 'taipei-101', destination: '台灣' }
  }
  const tagSlugs: Record<string, string> = {
    賞花: 'cherry-blossom',
    賞楓: 'autumn-leaves',
    美食: 'food',
    親子: 'family',
    深度旅遊: 'in-depth',
    溫泉: 'onsen'
  }

  const legacyTags = sqlite.prepare('SELECT id, name, category FROM tags').all() as
    { id: number, name: string, category: string }[]

  // 刻意不關閉 foreign_keys：本機要跟 D1 的行為完全一致，才不會出現
  // 「本機正常、上線資料被 cascade 清掉」。下面的重建順序不依賴任何 pragma。
  const run = sqlite.transaction(() => {
    // 國家先建，城市的 parent_id 才有得指
    for (const pass of ['country', 'city'] as const) {
      for (const t of legacyTags.filter(t => t.category === 'location')) {
        const d = destSlugs[t.name]
        if (!d || d.type !== pass) continue
        const parentId = d.parent
          ? (sqlite.prepare('SELECT id FROM destinations WHERE slug = ?')
              .get(destSlugs[d.parent]!.slug) as { id: number } | undefined)?.id ?? null
          : null
        sqlite.prepare(
          'INSERT OR IGNORE INTO destinations (slug, name, type, parent_id, is_domestic) VALUES (?, ?, ?, ?, ?)'
        ).run(d.slug, t.name, d.type, parentId, d.domestic ? 1 : 0)
      }
    }

    for (const t of legacyTags.filter(t => t.category === 'attraction')) {
      const s = spotSlugs[t.name]
      if (!s) continue
      const destId = s.destination
        ? (sqlite.prepare('SELECT id FROM destinations WHERE slug = ?')
            .get(destSlugs[s.destination]!.slug) as { id: number } | undefined)?.id ?? null
        : null
      sqlite.prepare('INSERT OR IGNORE INTO spots (slug, name, destination_id) VALUES (?, ?, ?)')
        .run(s.slug, t.name, destId)
    }

    sqlite.exec(`
      INSERT INTO trip_destinations (trip_id, destination_id, is_primary)
      SELECT tt.trip_id, d.id, 0 FROM trip_tags tt
      JOIN tags t ON t.id = tt.tag_id AND t.category = 'location'
      JOIN destinations d ON d.name = t.name;

      UPDATE trip_destinations SET is_primary = 1
      WHERE destination_id IN (SELECT id FROM destinations WHERE type = 'city');

      UPDATE trip_destinations SET is_primary = 1
      WHERE destination_id IN (SELECT id FROM destinations WHERE type = 'country')
        AND trip_id NOT IN (
          SELECT td.trip_id FROM trip_destinations td
          JOIN destinations d ON d.id = td.destination_id WHERE d.type = 'city'
        );

      INSERT INTO trip_spots (trip_id, spot_id)
      SELECT tt.trip_id, s.id FROM trip_tags tt
      JOIN tags t ON t.id = tt.tag_id AND t.category = 'attraction'
      JOIN spots s ON s.name = t.name;
    `)

    // 重建 tags：移除 category、加上 slug，保留原 id。
    //
    // ⚠️ 順序與 migrations/0003 的第 5 節必須完全一致：trip_tags.tag_id 是
    // ON DELETE CASCADE，只要 DROP TABLE tags 的當下還有外鍵指向 tags，
    // SQLite 的隱含 DELETE 就會把主題標籤關聯整批 cascade 掉，而且不會報錯。
    // pragma 擋不住這件事（foreign_keys 在交易內是 no-op、defer_foreign_keys
    // 只延後違規檢查、不會停用 cascade 動作），所以必須先把要保留的資料搬到
    // 沒有外鍵的暫存表、先卸掉 trip_tags，才能安全重建 tags。
    sqlite.exec(`
      CREATE TABLE trip_tags_backup (
        trip_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL
      );

      INSERT INTO trip_tags_backup (trip_id, tag_id)
      SELECT tt.trip_id, tt.tag_id FROM trip_tags tt
      JOIN tags t ON t.id = tt.tag_id
      WHERE t.category = 'type';

      DROP TABLE trip_tags;

      CREATE TABLE tags_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE
      );
    `)
    for (const t of legacyTags.filter(t => t.category === 'type')) {
      sqlite.prepare('INSERT INTO tags_new (id, slug, name) VALUES (?, ?, ?)')
        .run(t.id, tagSlugs[t.name] ?? `tag-${t.id}`, t.name)
    }
    sqlite.exec(`
      DROP TABLE tags;
      ALTER TABLE tags_new RENAME TO tags;

      CREATE TABLE trip_tags (
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE
      );

      INSERT INTO trip_tags (trip_id, tag_id)
      SELECT trip_id, tag_id FROM trip_tags_backup;

      DROP TABLE trip_tags_backup;
    `)
  })
  run()
}

function applyLocalColumnMigrations(sqlite: import('better-sqlite3').Database) {
  addColumnIfMissing(sqlite, 'trips', 'badge', 'TEXT')
  addColumnIfMissing(sqlite, 'trips', 'seo_title', 'TEXT')
  addColumnIfMissing(sqlite, 'trips', 'seo_description', 'TEXT')
  addColumnIfMissing(sqlite, 'batches', 'price_from', 'INTEGER')
  addColumnIfMissing(sqlite, 'content_snippets', 'mode', 'TEXT NOT NULL DEFAULT \'copy\'')
  addColumnIfMissing(
    sqlite, 'content_blocks', 'snippet_id',
    'INTEGER REFERENCES content_snippets(id) ON DELETE SET NULL'
  )
  // 對應 migrations/0005：既有留言視為已讀，避免功能上線時湧出一堆假的待辦
  const contactCols = sqlite.prepare('PRAGMA table_info(contact_submissions)').all() as { name: string }[]
  if (!contactCols.some(c => c.name === 'is_read')) {
    sqlite.exec('ALTER TABLE contact_submissions ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0')
    sqlite.exec('UPDATE contact_submissions SET is_read = 1')
  }
  migrateLegacyTagsSchema(sqlite)
  migrateLegacyMediaCategory(sqlite)
}

// 對應 migrations/0004：media.category（自由文字地名）改成 media_destinations 關聯。
// 用 DROP COLUMN 而不是重建 media 表 —— 重建會踩到 trip_images 的 cascade 陷阱。
function migrateLegacyMediaCategory(sqlite: import('better-sqlite3').Database) {
  const columns = sqlite.prepare('PRAGMA table_info(media)').all() as { name: string }[]
  if (!columns.some(c => c.name === 'category')) return // 已經是新結構

  const run = sqlite.transaction(() => {
    sqlite.exec(`
      INSERT INTO media_destinations (media_id, destination_id)
      SELECT m.id, d.id FROM media m
      JOIN destinations d ON d.name = m.category
      WHERE m.category IS NOT NULL AND m.category <> '';

      ALTER TABLE media DROP COLUMN category;
    `)
  })
  run()
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
      badge TEXT,
      rank INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT,
      seo_description TEXT,
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
      price_from INTEGER,
      group_size INTEGER,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      parent_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL,
      is_domestic INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      cover_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
      rank INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS trip_destinations (
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
      is_primary INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS spots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL,
      description TEXT,
      address TEXT,
      lat TEXT,
      lng TEXT,
      cover_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS trip_spots (
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      spot_id INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS trip_tags (
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      r2_key TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS media_destinations (
      media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
      destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS media_spots (
      media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
      spot_id INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE
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
      snippet_id INTEGER REFERENCES content_snippets(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS content_snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'copy',
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
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );
  `)

  applyLocalColumnMigrations(getLocalSqlite())
}
