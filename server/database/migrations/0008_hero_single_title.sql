-- 首頁 hero 文案：標題＋副標兩欄 → 只留一欄
--
-- 為什麼要改：hero 視覺上已經拿掉大標，畫面上只剩原本副標那一行字。
-- 留著兩個欄位會讓後台要填兩格、但其中一格永遠不會顯示 —— 那是最容易讓人填了
-- 卻找不到效果的設計。既然只顯示一行，資料就只該有一行。
--
-- 保留下來的是「副標」的內容（例如「帶你走進每一段值得記住的旅程」），因為那正是
-- 現在畫面上唯一顯示的字。原本 title 的「無穹旅行社」不會消失 —— 它本來就同時
-- 出現在導覽列 logo 與瀏覽器分頁標題（usePageSeo），不需要 hero 再講一次。
--
-- ⚠️ 沒有 DROP TABLE，只有 UPDATE 與 DROP COLUMN。重建資料表會觸發其他表指向它的
-- ON DELETE CASCADE 把關聯資料靜默清空（0003 中過一次）。DROP COLUMN 不會有這個問題
-- （0006 已經用同樣手法移除過 image_url）。

-- 副標是空字串時維持原本的 title，不要把畫面清成空白
UPDATE hero_content
SET title = subtitle
WHERE subtitle IS NOT NULL AND TRIM(subtitle) <> '';

ALTER TABLE hero_content DROP COLUMN subtitle;
