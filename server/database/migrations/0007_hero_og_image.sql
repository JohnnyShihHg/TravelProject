-- 首頁專用的社群分享圖（og:image）
--
-- 為什麼要加：實測線上 /、/trips、/about、/contact 四頁完全沒有輸出 og:image
-- （行程／目的地／景點頁有，它們用自己的封面照）。首頁是最常被貼到 LINE／FB 的網址，
-- 分享出去卻只有一張沒有圖的純文字卡。
--
-- 為什麼加在 hero_content 而不是開新表：這張表本來就只服務首頁（見 schema.ts 的註解，
-- 其他三頁沒有可編輯的文案，只有 hero_images）。首頁專用的設定放這裡天生吻合，
-- 不需要為了一個欄位多一張表。其他頁面不需要這個欄位 —— 它們自動用該頁自己的照片。
--
-- ON DELETE SET NULL 而不是 CASCADE：媒體庫的照片被刪掉時，首頁應該退回「沒有指定
-- 分享圖」的狀態（程式會自動改用第一張 hero 圖），而不是連帶把 hero_content 整列刪掉。
--
-- ⚠️ 全程沒有 DROP TABLE，只有 ADD COLUMN。重建資料表會觸發其他表指向它的
-- ON DELETE CASCADE、把關聯資料靜默清空（0003 中過一次，0006 也特別標注了這件事）。

ALTER TABLE hero_content ADD COLUMN og_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL;
