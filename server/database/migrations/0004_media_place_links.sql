-- 0004: 照片改成關聯地點／景點，移除自由文字的 media.category。
--
-- category 存的其實就是地名（東京／京都／北海道…），是 destinations 的字串複製品：
--   1. 自由文字 → 「東京 」「Tokyo」會變成另一個分類且不會報錯
--   2. 只能有一個值 → 清水寺的照片沒辦法同時屬於「京都」和「清水寺」
--   3. 不是實體關聯 → 跟 destinations 表毫無關係
-- 換成關聯之後，landing page 的相簿就是「掛了這個地點的照片」，不必另外維護清單。
--
-- 注意：這裡用 ALTER TABLE ... DROP COLUMN 而不是重建 media 表。
-- 重建會踩到 0003 那個 cascade 陷阱（trip_images / destinations / spots 都有外鍵
-- 指向 media，DROP TABLE media 會把 trip_images 整批 cascade 清空）。
-- DROP COLUMN 不動資料列，沒有這個問題。

CREATE TABLE IF NOT EXISTS media_destinations (
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media_spots (
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  spot_id INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE
);

-- 既有的 category 值就是地點名稱，一對一對得上
INSERT INTO media_destinations (media_id, destination_id)
SELECT m.id, d.id
FROM media m
JOIN destinations d ON d.name = m.category
WHERE m.category IS NOT NULL AND m.category <> '';

ALTER TABLE media DROP COLUMN category;

CREATE INDEX IF NOT EXISTS idx_media_destinations_media ON media_destinations(media_id);
CREATE INDEX IF NOT EXISTS idx_media_destinations_dest ON media_destinations(destination_id);
CREATE INDEX IF NOT EXISTS idx_media_spots_media ON media_spots(media_id);
CREATE INDEX IF NOT EXISTS idx_media_spots_spot ON media_spots(spot_id);
