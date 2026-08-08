# 無穹旅行社官網 — 規劃筆記（Grill 已完成，設計確認版）

> 2026-08-08 完成 grill 逼問，以下為最終確認設計，可作為實作依據。

## 基礎設施
- Cloudflare 全家桶：Worker（後端 API）+ Pages（前端，這個 repo 是 Nuxt 4）+ R2（媒體）+ D1（資料庫）
- **純展示型網站，無金流、無報名/成團機制**（batch 上的成團人數/費用僅供顯示參考，不做庫存扣減或線上付款）
- 單人旅行社，無多人協作/多帳號問題
- 品牌全名：**無穹旅行社**（正式品牌名，不要改成別的字）

## 現況（2026-08-08 掃描）
`G:\travel\TravelProject` 目前是幾乎空的 Nuxt 4 骨架：
- Nuxt `^4.5.2` + Vue 3.5 + TypeScript + Tailwind CSS 4
- 已裝：`@nuxt/ui` v4、`@nuxt/image`、`@nuxt/icon`、`@nuxt/fonts`、`@nuxt/eslint`、完整一套 `@tiptap/*`（後台富文本編輯器用）
- `app/pages` 只有 `index.vue`；`app/components` 只有 `AppHeader.vue`、`HeroSection.vue`、`TrendingSection.vue`（靜態雛形）
- **完全沒有 Cloudflare 整合**：無 wrangler 設定、無 nitro cloudflare preset、無 D1/R2/KV 綁定、無 schema、無 `.env*` 檔案
- 可以從零開始建置，不用顧慮既有實作衝突

## 資料模型（D1）
- **`trips`**（行程樣板）：標題、tiptap 富文本介紹（天數行程等自由內容）、天數、`status`（draft / published）、`is_featured`、`rank`
  - `status` 只在 trip 層級控管；trip 為 draft 時，底下所有 batch 一起隱藏（後台手機臨時編輯避免誤發）
  - `is_featured` 精選首頁熱門行程，語意是「未來會出團的熱門行程」，非過去資料
- **`batches`**（出團梯次）：`trip_id`、出發日期、班機、集合地點、費用說明、**成團人數**（原筆記寫「名額」，已修正為成團人數，非庫存扣減用途）；一個 trip 可對應多個 batch
- **`tags`** + **`trip_tags`**（多對多關聯）：`tags.category` 區分 location（地點）/ attraction（景點）/ type（類型，如賞花）
- **`media`** + **`trip_images`**（關聯表）：media 為共用媒體庫（存 r2_key、category），可跨行程重複使用；`trip_images` 存 `trip_id, media_id, is_cover, sort_order`
  - R2 路徑慣例：`trips/{tripId}/{filename}` 或依 media 分類存放
  - 後台上傳新行程時可依分類篩選瀏覽媒體庫，直接勾選重複使用既有照片
- **`contact_submissions`**：姓名、聯絡電話、Email（至少一種聯絡方式必填）、有興趣的行程（可選，關聯 trip）、留言內容

## 搜尋
- D1 全表 LIKE，先比對 tag，比對不到再 fallback 比對標題/內文（解決「標題有『櫻花』但 tag 沒建」的搜尋落空問題）
- **不使用 FTS5**：單人旅行社規模約一年 20 團，資料量小，LIKE 已足夠；FTS5 是為大量文件/高頻查詢設計，先不需要

## 前台（公開網頁）

| 頁面 | 功能 |
|---|---|
| 出團資訊 | 上方日曆標記 batch 出團日期；下方行程卡片列表；點進單一行程＝trip 內容頁（類部落格文章頁） |
| 關於無穹 | **純靜態內容，直接寫死在 Nuxt 頁面裡（含照片），不走後台 CMS**；品牌故事、主要帶團路線介紹 |
| 聯絡我們 | **純靜態頁面框架（含照片），表單提交後存 D1 + Telegram 通知**；欄位見上方 contact_submissions |
| 首頁 | Hero 區塊（後台可編）+ 搜尋 Bar + 「當前熱門」（`trips.is_featured` 精選，資料來源與出團資訊共用 trips 表） |

### 行程詳情頁內容編輯粒度
- 主要行程介紹：tiptap 富文本一大塊自由編輯
- 查詢/篩選/顯示會用到的結構化資訊（日期、班機、集合地點、費用說明、成團人數）：獨立固定欄位，放在 batch 上
- 不需要完整日曆 widget（日曆只在出團資訊頁上方用）
- 參考格式：一般旅行社產品頁（使用者提供範例：雄獅旅遊 https://travel.liontravel.com/detail?...）

## 後台（管理介面）
- **驗證機制**：Cloudflare Zero Trust（Access）保護 `/admin` 路由，不自建帳密登入/session
- 發布行程（trip 層級 draft/published 狀態）
- 編輯行程（含 tiptap 富文本、media 媒體庫選圖）
- 出團日曆調整（管理 batch：日期、班機、集合地點、費用說明、成團人數）
- 編輯首頁 Hero

## 相關舊專案（僅供技術棧參考，非同一個網站）
- `G:\PageWorker`：Cloudflare Worker + D1，攝影作品集網站（zhendoku.com）後端，架構可參考（分類/相簿/照片/標籤/批次刪除的實作模式），但資料模型跟旅行社無關，不要混用同一個 D1。
