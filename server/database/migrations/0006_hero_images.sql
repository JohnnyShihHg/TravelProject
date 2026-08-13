-- Hero 圖片：單張自由文字網址 → 媒體庫的多張圖（輪播）
--
-- 為什麼要改：hero_content.image_url 是一個自由文字欄位，後台只能貼網址，不能上傳，
-- 所以正式站的首頁 hero 一直掛著外部的 picsum 假圖。/trips、about、contact 三頁的 hero
-- 更是直接寫死在 .vue 裡，連後台都碰不到。改成指向 media 表之後，四頁的 hero 都能在後台
-- 上傳、排序，圖片也一併走 R2 與響應式縮圖。
--
-- page 欄位讓四個頁面共用同一張表：hero_content 仍然只服務首頁的標題／副標，
-- 其他三頁只需要圖片，不需要為它們各開一張表或各加一組欄位。
--
-- ⚠️ 全程沒有 DROP TABLE。重建資料表會觸發其他表指向它的 ON DELETE CASCADE，
-- 把關聯資料靜默清空（0003 就中過一次），這裡只用 CREATE / INSERT SELECT / DROP COLUMN。

CREATE TABLE IF NOT EXISTS hero_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL DEFAULT 'home',
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS hero_images_page_idx ON hero_images(page, sort_order);

-- 舊的單張圖如果本來就指向媒體庫（/media/...）就搬過來；指向 picsum 的話
-- JOIN 不到任何一列，自然什麼都不會插入 —— 那種假圖本來也不該留著。
INSERT INTO hero_images (page, media_id, sort_order)
SELECT 'home', m.id, 0
FROM hero_content h
JOIN media m ON m.url = h.image_url;

-- 網址現在一律由 media 表產生，這個欄位留著只會有兩份真相
ALTER TABLE hero_content DROP COLUMN image_url;
