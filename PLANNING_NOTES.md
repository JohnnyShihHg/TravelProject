# 無穹旅行社官網 — 規劃筆記（Grill 已完成，設計確認版）

> 2026-08-08 完成 grill 逼問，以下為最終確認設計，可作為實作依據。

## 📝 待辦（下次處理，接續 2026-08-08 進度）
- [ ] **驗證 `/admin` RWD 修正**：2026-08-08 把後台所有橫向擠壓的排版改成手機寬度向下堆疊、已部署上測試站，但當時瀏覽器自動化工具的視窗縮放在這個環境沒生效，沒能實際截圖確認窄螢幕（iPhone 17 基礎版寬度 ~390-400px）畫面。**麻煩用手機或瀏覽器開發者工具的裝置模擬實際打開 `/admin` 檢查**，有問題再告訴我要調整哪個畫面
- [ ] **`/admin` 還是完全沒有登入驗證**：講了好幾次的 Cloudflare Access（Zero Trust）一直沒做，測試站目前任何人知道網址都能進後台改資料。等客戶決定要正式使用前一定要補
- [ ] **自訂網域**：目前測試站是 `wuqiong-travel.nadia861130.workers.dev` 免費子網域，正式上線需要客戶提供他自己的網域（要先加進他的 Cloudflare 帳號）
- [ ] **Telegram 通知沒真的串接**：聯絡表單送出後目前只是存 D1、沒有真的發 Telegram 訊息通知（`server/api/contact.post.ts` 裡有寫好串接邏輯，只是沒設定 `telegramBotToken`/`telegramChatId`）
- [ ] **行程瀏覽紀錄功能**：使用者提過想記錄訪客看過哪些行程，細節還沒 grill 過，詳見下方「待確認」章節
- [ ] **目前 6 筆行程都是假資料**（我編的示範內容），正式上線前要換成客戶真實的行程資料，圖片也要換成真的照片（現在種子資料的圖是 picsum.photos 隨機圖）

## ⚠️ 部署帳號注意事項（2026-08-08）
這個網站是幫**客戶**做的，正式/測試環境都必須部署到**客戶自己的 Cloudflare 帳號**，不是開發者（johnny.shih1997@gmail.com）自己的帳號。
2026-08-08 曾經誤用開發者自己登入的 wrangler session 建立過一個測試用 Worker（`wuqiong-travel-test`）與 D1 資料庫（`travelproject-test`），事後已經完整刪除（`wrangler delete` + `wrangler d1 delete`，並確認帳號上沒有殘留）。
**之後任何 `wrangler deploy` / `wrangler d1 create` 之類會建立雲端資源的指令，動手前一定要先確認目前 wrangler 登入的是客戶的帳號，不是開發者自己的帳號**（用 `wrangler whoami` 確認）。

**已確認的客戶帳號**（2026-08-08 客戶親自在本機執行 `wrangler login` 授權）：
- Email：`nadia861130@gmail.com`
- Account ID：`d533ce3cc36dd35fbf18273d2db0d264`
- 之後在這台機器上部署 TravelProject，wrangler 登入的帳號應該都是這個；如果 `wrangler whoami` 顯示的不是這個帳號，代表登入狀態被換掉了，動手前要先確認/重新登入。

**已知 wrangler 帳號自動解析 bug**：這台機器上 `wrangler whoami` 顯示正確帳號，但部分指令（例如 `wrangler d1 create`）內部解析 account_id 時有時仍會抓到別的帳號（實測抓到過開發者自己的帳號 id）。因此 `wrangler.jsonc` 裡明確寫死 `"account_id": "d533ce3cc36dd35fbf18273d2db0d264"`，之後任何新增雲端資源的指令最好也明確帶上 `CLOUDFLARE_ACCOUNT_ID=d533ce3cc36dd35fbf18273d2db0d264` 環境變數，不要完全信任自動解析。

## 測試站部署狀態（2026-08-08）
已部署到客戶帳號：**https://wuqiong-travel.nadia861130.workers.dev**
- Worker 名稱：`wuqiong-travel`
- D1 資料庫：`wuqiong-travel`（id `a16f9442-c457-4ef8-b9d6-e082ae7b6efb`），schema 見 `server/database/migrations/0000_init.sql`，測試假資料見 `0001_seed.sql`（從本機 SQLite 假資料匯出）
- `wrangler.jsonc` 裡 `assets.run_worker_first: true` 是必要設定——沒設的話 Cloudflare 的靜態資源會攔截掉所有非首頁的 SSR 路由（`/about`、`/trips/[slug]` 等會變成 404，因為請求根本不會轉給 Worker 處理）
- `/admin` 目前依然完全沒有登入驗證，這是測試站，之後如果要給客戶正式使用一定要補 Cloudflare Access
- **R2 + Images binding 已接上**（2026-08-09）：`wuqiong-travel-media` bucket + `images` binding，後台上傳照片會真的壓縮（縮到最大寬 1600px、轉 webp、quality 75）存進 R2；本機開發沒有這些 binding，上傳會存到本機磁碟 `.data/uploads` 不壓縮，純供本機預覽用
- 後台已補上手機寬度 RWD（2026-08-09），見上方待辦第一項，還沒實機驗證過

## 基礎設施
- Cloudflare 全家桶：Worker（後端 API）+ Pages（前端，這個 repo 是 Nuxt 4）+ R2（媒體）+ D1（資料庫）
- **純展示型網站，無金流、無報名/成團機制**（batch 上的成團人數/費用僅供顯示參考，不做庫存扣減或線上付款）
- 單人旅行社，無多人協作/多帳號問題
- 品牌全名：**無穹旅行社**（正式品牌名，不要改成別的字）

## 實作進度（2026-08-08）
本地 SQLite 版本 prototype 已建置完成（trips/batches/tags/media/contact_submissions/hero_content + seed 假資料 + 前台五頁 + 後台 CRUD，含 `app/layouts/default.vue`＋`AppHeader`/`AppFooter`、`app/layouts/admin.vue`）。**尚未接上真的 Cloudflare（Worker/D1/R2/Zero Trust）**，`/admin` 目前完全沒有登入驗證，正式部署前必須補上。下方「現況（2026-08-08 掃描）」為建置前的骨架快照，僅供歷史參考。

## 現況（2026-08-08 掃描，建置前快照）
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
- **前台不放後台連結**：一開始曾在公開頁 Footer 加過「後台管理」連結方便本地開發時尋找入口，已依使用者指示移除。之後前台（Header/Footer/任何公開頁面）都不要再放通往 `/admin` 的連結，後台入口只用網址直接輸入，正式上線後靠 Zero Trust 擋住即可，不需要也不應該從前台曝光。

## 待確認（新增，尚未實作）
- **行程瀏覽紀錄**：使用者想記錄訪客點過/查看過哪些行程（例如用於之後分析熱門行程、或做「最近瀏覽」功能）。目前完全沒有這塊機制。待確認的問題：
  - 目的是什麼？單純統計每個行程的瀏覽次數（trips 表加 view_count 即可），還是要看「同一個人看過哪些行程」（需要匿名訪客識別，例如 cookie/localStorage 存的 session id，沒有會員系統的情況下如何界定「同一人」）？
  - 要不要影響「當前熱門」的精選邏輯（目前 is_featured 是後台手動選的，之後會不會想改成依瀏覽量自動排序，或兩者併存）？
  - 資料保留多久、要不要做成後台可查看的報表？
  - 這件事還沒跟使用者 grill 過，之後要另外討論再決定資料表設計與實作方式。

## 相關舊專案（僅供技術棧參考，非同一個網站）
- `G:\PageWorker`：Cloudflare Worker + D1，攝影作品集網站（zhendoku.com）後端，架構可參考（分類/相簿/照片/標籤/批次刪除的實作模式），但資料模型跟旅行社無關，不要混用同一個 D1。
