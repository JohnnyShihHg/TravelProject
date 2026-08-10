// 在乾淨的資料庫上依序套用 server/database/migrations/*.sql，模擬 D1 上
// `wrangler d1 migrations apply --remote` 的實際流程，並驗證結果符合預期。
//
// 為什麼需要這支腳本：
// migration 跑「成功」不代表資料是對的。0003 曾經有一個不會報錯的 bug —— DROP TABLE tags
// 觸發 trip_tags 的 ON DELETE CASCADE，把所有主題標籤關聯靜默清空。wrangler 會回報成功，
// 但線上資料已經毀了。任何動到既有資料表的 migration，都應該先用這支腳本驗證。
//
// 用法：npm run db:verify

import Database from 'better-sqlite3'
import { readFileSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = 'server/database/migrations'
const TMP_DB = '.data/.verify-migrations.sqlite'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`  ${ok ? '✓' : '✗'} ${label}`)
  if (!ok) {
    failures++
    console.log(`      expected: ${JSON.stringify(expected)}`)
    console.log(`      actual:   ${JSON.stringify(actual)}`)
  }
}

if (existsSync(TMP_DB)) rmSync(TMP_DB)
const db = new Database(TMP_DB)
db.pragma('foreign_keys = ON') // 與正式環境一致，才能抓到 cascade 問題

console.log('套用 migrations：')
for (const file of readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()) {
  db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  console.log(`  applied ${file}`)
}

const rows = sql => db.prepare(sql).all()
const one = sql => db.prepare(sql).get()

console.log('\n地點階層：')
check('6 個 destination', one('SELECT COUNT(*) c FROM destinations').c, 6)
check('3 個國家', one("SELECT COUNT(*) c FROM destinations WHERE type='country'").c, 3)
check(
  '城市都掛在日本底下',
  rows(`SELECT d.name FROM destinations d JOIN destinations p ON p.id = d.parent_id
        WHERE d.type='city' AND p.slug='japan' ORDER BY d.rank`).map(r => r.name),
  ['東京', '京都', '北海道']
)
check(
  '只有台灣是國內線',
  rows('SELECT name FROM destinations WHERE is_domestic=1').map(r => r.name),
  ['台灣']
)

console.log('\n景點：')
check(
  '3 個景點，掛在正確的地點上',
  rows(`SELECT s.name, d.name dest FROM spots s
        LEFT JOIN destinations d ON d.id = s.destination_id ORDER BY s.id`),
  [
    { name: '富士山', dest: '日本' }, // 刻意不掛東京：它不在東京都內
    { name: '清水寺', dest: '京都' },
    { name: '101', dest: '台灣' }
  ]
)

console.log('\n標籤（迴歸測試：cascade 靜默清空事故）：')
check('tags 只剩主題標籤', one('SELECT COUNT(*) c FROM tags').c, 6)
check('tags.category 已移除', db.prepare('PRAGMA table_info(tags)').all().some(c => c.name === 'category'), false)
check('tags 都有 slug', one("SELECT COUNT(*) c FROM tags WHERE slug IS NULL OR slug=''").c, 0)
// 這一項就是當初的 bug：DROP TABLE tags 會 cascade 掉 trip_tags 全部的列
check('主題標籤關聯有保留下來', one('SELECT COUNT(*) c FROM trip_tags').c, 9)
check('沒有孤兒 trip_tags', one('SELECT COUNT(*) c FROM trip_tags tt LEFT JOIN tags t ON t.id=tt.tag_id WHERE t.id IS NULL').c, 0)

console.log('\n行程關聯：')
check(
  '每個有地點的行程恰好一條麵包屑路徑',
  rows('SELECT trip_id FROM trip_destinations WHERE is_primary=1 GROUP BY trip_id HAVING COUNT(*)<>1').length,
  0
)
check('景點關聯已從 trip_tags 搬過來', one('SELECT COUNT(*) c FROM trip_spots').c, 3)
check(
  '麵包屑優先用城市，沒有城市才用國家',
  rows(`SELECT td.trip_id, d.name FROM trip_destinations td
        JOIN destinations d ON d.id=td.destination_id
        WHERE td.is_primary=1 ORDER BY td.trip_id`).map(r => r.name),
  ['東京', '京都', '北海道', '韓國', '台灣', '京都']
)

console.log('\n新欄位：')
const cols = t => db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name)
check('trips.seo_title / seo_description', cols('trips').filter(n => n.startsWith('seo')), ['seo_title', 'seo_description'])
check('batches.price_from 已回填', one('SELECT COUNT(*) c FROM batches WHERE price_from IS NULL').c, 0)
check('content_snippets.mode', cols('content_snippets').includes('mode'), true)
check('content_blocks.snippet_id', cols('content_blocks').includes('snippet_id'), true)

console.log('\n媒體關聯（0004：category 自由文字 → 實體關聯）：')
check('media.category 已移除', cols('media').includes('category'), false)
// 0002 的假資料每個行程有 4 張照片（1 封面 + 3 相簿），category 是主要地點名稱，
// 遷移後每張照片應該剛好掛上一個地點
check('category 的地名已轉成關聯', one('SELECT COUNT(*) c FROM media_destinations').c, 24)
check(
  '沒有孤兒關聯',
  one(`SELECT COUNT(*) c FROM media_destinations md
       LEFT JOIN media m ON m.id = md.media_id
       LEFT JOIN destinations d ON d.id = md.destination_id
       WHERE m.id IS NULL OR d.id IS NULL`).c,
  0
)
// 這一項是重點：DROP COLUMN 不該像 DROP TABLE 那樣 cascade 掉 trip_images
check('trip_images 沒有被誤刪', one('SELECT COUNT(*) c FROM trip_images').c, 24)

console.log('\n聯絡表單已讀狀態（0005）：')
check('contact_submissions.is_read 已加上', cols('contact_submissions').includes('is_read'), true)
// 既有留言必須視為已讀，否則功能一上線儀表板就跳出一堆假的待辦
check('既有留言全部視為已讀', one('SELECT COUNT(*) c FROM contact_submissions WHERE is_read = 0').c, 0)

console.log('\n完整性：')
check('foreign_key_check 無違規', db.pragma('foreign_key_check').length, 0)

db.close()
rmSync(TMP_DB)

console.log(failures === 0 ? '\n✅ 全部通過' : `\n❌ ${failures} 項失敗`)
process.exit(failures === 0 ? 0 : 1)
