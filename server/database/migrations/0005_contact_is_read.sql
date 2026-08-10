-- 0005: 聯絡表單留言加上已讀狀態。
-- 儀表板原本顯示的是留言「總數」，那個數字只會一直長大、看久了就失去意義；
-- 改成顯示「未讀」才是真正的待辦提示。
--
-- 既有留言一律視為已讀：它們在這個功能上線前就已經被看過了，
-- 預設成未讀會讓儀表板一上線就跳出一堆假的待辦。

ALTER TABLE contact_submissions ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0;

UPDATE contact_submissions SET is_read = 1;
