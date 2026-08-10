-- 0003: 把 tags 拆成 destinations（地點階層）/ spots（景點）/ tags（主題標籤），
-- 並補上 SEO 覆寫欄位、JSON-LD 用的數字價格、snippet 引用模式。
-- 設計說明見 SCHEMA_REDESIGN.md。
--
-- 注意：本檔案含資料遷移，slug 是人工指定的（資料量小，直接寫死）。
-- 對應的本機路徑在 server/utils/db.ts，兩邊必須保持一致。

-- 重建 tags 需要先卸掉外鍵檢查（標準的 SQLite table-rebuild 流程）
PRAGMA defer_foreign_keys = true;

-- ---------------------------------------------------------------
-- 1. 新表
-- ---------------------------------------------------------------

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

-- ---------------------------------------------------------------
-- 2. location tags -> destinations
--    國家先建（city 的 parent_id 要指向它們）
-- ---------------------------------------------------------------

INSERT INTO destinations (slug, name, type, parent_id, is_domestic, rank)
SELECT 'japan', '日本', 'country', NULL, 0, 1
WHERE EXISTS (SELECT 1 FROM tags WHERE name = '日本' AND category = 'location')
  AND NOT EXISTS (SELECT 1 FROM destinations WHERE slug = 'japan');

INSERT INTO destinations (slug, name, type, parent_id, is_domestic, rank)
SELECT 'korea', '韓國', 'country', NULL, 0, 2
WHERE EXISTS (SELECT 1 FROM tags WHERE name = '韓國' AND category = 'location')
  AND NOT EXISTS (SELECT 1 FROM destinations WHERE slug = 'korea');

-- 台灣是唯一的國內線來源
INSERT INTO destinations (slug, name, type, parent_id, is_domestic, rank)
SELECT 'taiwan', '台灣', 'country', NULL, 1, 3
WHERE EXISTS (SELECT 1 FROM tags WHERE name = '台灣' AND category = 'location')
  AND NOT EXISTS (SELECT 1 FROM destinations WHERE slug = 'taiwan');

INSERT INTO destinations (slug, name, type, parent_id, is_domestic, rank)
SELECT 'tokyo', '東京', 'city', (SELECT id FROM destinations WHERE slug = 'japan'), 0, 1
WHERE EXISTS (SELECT 1 FROM tags WHERE name = '東京' AND category = 'location')
  AND NOT EXISTS (SELECT 1 FROM destinations WHERE slug = 'tokyo');

INSERT INTO destinations (slug, name, type, parent_id, is_domestic, rank)
SELECT 'kyoto', '京都', 'city', (SELECT id FROM destinations WHERE slug = 'japan'), 0, 2
WHERE EXISTS (SELECT 1 FROM tags WHERE name = '京都' AND category = 'location')
  AND NOT EXISTS (SELECT 1 FROM destinations WHERE slug = 'kyoto');

INSERT INTO destinations (slug, name, type, parent_id, is_domestic, rank)
SELECT 'hokkaido', '北海道', 'city', (SELECT id FROM destinations WHERE slug = 'japan'), 0, 3
WHERE EXISTS (SELECT 1 FROM tags WHERE name = '北海道' AND category = 'location')
  AND NOT EXISTS (SELECT 1 FROM destinations WHERE slug = 'hokkaido');

-- ---------------------------------------------------------------
-- 3. attraction tags -> spots
--    富士山刻意掛在「日本」而非「東京」：它實際不在東京都內
-- ---------------------------------------------------------------

INSERT INTO spots (slug, name, destination_id)
SELECT 'mount-fuji', '富士山', (SELECT id FROM destinations WHERE slug = 'japan')
WHERE EXISTS (SELECT 1 FROM tags WHERE name = '富士山' AND category = 'attraction')
  AND NOT EXISTS (SELECT 1 FROM spots WHERE slug = 'mount-fuji');

INSERT INTO spots (slug, name, destination_id)
SELECT 'kiyomizu-dera', '清水寺', (SELECT id FROM destinations WHERE slug = 'kyoto')
WHERE EXISTS (SELECT 1 FROM tags WHERE name = '清水寺' AND category = 'attraction')
  AND NOT EXISTS (SELECT 1 FROM spots WHERE slug = 'kiyomizu-dera');

INSERT INTO spots (slug, name, destination_id)
SELECT 'taipei-101', '101', (SELECT id FROM destinations WHERE slug = 'taiwan')
WHERE EXISTS (SELECT 1 FROM tags WHERE name = '101' AND category = 'attraction')
  AND NOT EXISTS (SELECT 1 FROM spots WHERE slug = 'taipei-101');

-- ---------------------------------------------------------------
-- 4. trip_tags -> trip_destinations / trip_spots
-- ---------------------------------------------------------------

INSERT INTO trip_destinations (trip_id, destination_id, is_primary)
SELECT tt.trip_id, d.id, 0
FROM trip_tags tt
JOIN tags t ON t.id = tt.tag_id AND t.category = 'location'
JOIN destinations d ON d.name = t.name;

-- 城市比國家精確，優先當作麵包屑路徑；沒有城市的行程才用國家
UPDATE trip_destinations
SET is_primary = 1
WHERE destination_id IN (SELECT id FROM destinations WHERE type = 'city');

UPDATE trip_destinations
SET is_primary = 1
WHERE destination_id IN (SELECT id FROM destinations WHERE type = 'country')
  AND trip_id NOT IN (
    SELECT td.trip_id FROM trip_destinations td
    JOIN destinations d ON d.id = td.destination_id
    WHERE d.type = 'city'
  );

INSERT INTO trip_spots (trip_id, spot_id)
SELECT tt.trip_id, s.id
FROM trip_tags tt
JOIN tags t ON t.id = tt.tag_id AND t.category = 'attraction'
JOIN spots s ON s.name = t.name;

-- ---------------------------------------------------------------
-- 5. 重建 tags：移除 category、加上 slug
--    保留原本的 id，所以既有的主題標籤關聯可以原樣搬回來。
--
--    ⚠️ 順序很重要：trip_tags.tag_id 是 ON DELETE CASCADE，
--    只要在 DROP TABLE tags 的當下還有任何表的外鍵指向 tags，
--    SQLite 的隱含 DELETE 就會把那些關聯一起 cascade 掉。
--    PRAGMA foreign_keys 在交易內是 no-op、defer_foreign_keys 也只延後
--    「違規檢查」而不會停用 cascade 動作，所以不能靠 pragma 擋，
--    必須先把要保留的資料搬到一張沒有外鍵的暫存表，並先卸掉 trip_tags。
-- ---------------------------------------------------------------

-- 5a. 只留主題標籤的關聯，先存到沒有外鍵的暫存表
CREATE TABLE trip_tags_backup (
  trip_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL
);

INSERT INTO trip_tags_backup (trip_id, tag_id)
SELECT tt.trip_id, tt.tag_id
FROM trip_tags tt
JOIN tags t ON t.id = tt.tag_id
WHERE t.category = 'type';

-- 5b. 先移除指向 tags 的外鍵來源，DROP TABLE tags 才不會 cascade
DROP TABLE trip_tags;

CREATE TABLE tags_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE
);

INSERT INTO tags_new (id, slug, name)
SELECT id,
  CASE name
    WHEN '賞花' THEN 'cherry-blossom'
    WHEN '賞楓' THEN 'autumn-leaves'
    WHEN '美食' THEN 'food'
    WHEN '親子' THEN 'family'
    WHEN '深度旅遊' THEN 'in-depth'
    WHEN '溫泉' THEN 'onsen'
    ELSE 'tag-' || id
  END,
  name
FROM tags
WHERE category = 'type';

DROP TABLE tags;
ALTER TABLE tags_new RENAME TO tags;

-- 5c. 重建 trip_tags 並把保留下來的關聯搬回去
CREATE TABLE trip_tags (
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE
);

INSERT INTO trip_tags (trip_id, tag_id)
SELECT trip_id, tag_id FROM trip_tags_backup;

DROP TABLE trip_tags_backup;

-- ---------------------------------------------------------------
-- 6. 既有表的新欄位
-- ---------------------------------------------------------------

ALTER TABLE trips ADD COLUMN seo_title TEXT;
ALTER TABLE trips ADD COLUMN seo_description TEXT;

ALTER TABLE batches ADD COLUMN price_from INTEGER;

ALTER TABLE content_snippets ADD COLUMN mode TEXT NOT NULL DEFAULT 'copy';
ALTER TABLE content_blocks ADD COLUMN snippet_id INTEGER REFERENCES content_snippets(id) ON DELETE SET NULL;

-- 既有假資料的數字價格（priceInfo 形如 "NT$ 42,900 起"，無法自動解析，直接對應）
UPDATE batches SET price_from = 42900 WHERE id = 1 AND price_from IS NULL;
UPDATE batches SET price_from = 45900 WHERE id = 2 AND price_from IS NULL;
UPDATE batches SET price_from = 52900 WHERE id = 3 AND price_from IS NULL;
UPDATE batches SET price_from = 54900 WHERE id = 4 AND price_from IS NULL;
UPDATE batches SET price_from = 46900 WHERE id = 5 AND price_from IS NULL;
UPDATE batches SET price_from = 28900 WHERE id = 6 AND price_from IS NULL;
UPDATE batches SET price_from = 31900 WHERE id = 7 AND price_from IS NULL;
UPDATE batches SET price_from = 8900 WHERE id = 8 AND price_from IS NULL;

-- ---------------------------------------------------------------
-- 7. 查詢用索引（landing page 與麵包屑會頻繁走這些關聯）
-- ---------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_trip_destinations_trip ON trip_destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_destinations_dest ON trip_destinations(destination_id);
CREATE INDEX IF NOT EXISTS idx_trip_spots_trip ON trip_spots(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_spots_spot ON trip_spots(spot_id);
CREATE INDEX IF NOT EXISTS idx_destinations_parent ON destinations(parent_id);
CREATE INDEX IF NOT EXISTS idx_spots_destination ON spots(destination_id);
