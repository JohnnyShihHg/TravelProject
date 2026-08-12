# 無穹旅行社官網 — 規劃筆記（Grill 已完成，設計確認版）

> 2026-08-08 完成 grill 逼問，最終確認設計見下方。
> **2026-08-12 更新**：資料模型已從「trips + 單一 tags 表」拆分為「trips / destinations / spots / tags 四個實體」（見下方「資料模型」章節），並補上全站 SEO（見「SEO」章節）。下方 2026-08-08 的舊版待辦與資料模型敘述已依現況修正，執行中的完整任務清單見 `IMPLEMENTATION_TASKS.md`（Phase A-D，依 bug → 資料庫 → UI → SEO/部署排序）。

## 📝 待辦（2026-08-12 現況）
- [ ] **`/admin` 還是完全沒有登入驗證**：講了好幾次的 Cloudflare Access（Zero Trust）一直沒做，測試站目前任何人知道網址都能進後台改資料。等客戶決定要正式使用前一定要補（`IMPLEMENTATION_TASKS.md` TASK D4）
- [ ] **自訂網域**：目前測試站是 `wuqiong-travel.nadia861130.workers.dev` 免費子網域，正式上線需要客戶提供他自己的網域（要先加進他的 Cloudflare 帳號）
- [ ] **Telegram 通知沒真的串接**：聯絡表單送出後目前只是存 D1、沒有真的發 Telegram 訊息通知（`server/api/contact.post.ts` 裡有寫好串接邏輯，只是沒設定 `telegramBotToken`/`telegramChatId`）
- [ ] **行程瀏覽紀錄功能**：使用者提過想記錄訪客看過哪些行程，細節還沒 grill 過，詳見下方「待確認」章節
- [ ] **目前的行程都是假資料**（示範內容），正式上線前要換成客戶真實的行程資料，圖片也要換成真的照片（現在種子資料的圖是 picsum.photos 隨機圖，見 `IMPLEMENTATION_TASKS.md` TASK D2）
- [ ] **migrations `0003`/`0004`/`0005`（地點/景點/SEO 相關 schema）尚未套用到正式 D1**，線上仍是舊 schema。部署前必看 `IMPLEMENTATION_TASKS.md` TASK D5 的檢查清單

## ✅ 已完成（2026-08-08 → 2026-08-12 期間，原「待辦」已解決的項目）
- [x] `/admin` RWD 已驗證（手機寬度向下堆疊）
- [x] 資料模型拆分：地點（destinations）／景點（spots）／主題標籤（tags）三個獨立實體，各自有 landing page 與後台管理頁
- [x] 全站 SEO：`usePageSeo` composable、JSON-LD、動態 `sitemap.xml`、`robots.txt`
- [x] 後台改為分組側邊欄 + 階段式行程編輯器，行程列表拆成獨立的 `/admin/trips` 頁
- [x] 真的圖片上傳，接 R2 + Images binding 自動壓縮
- [x] 費用改成只填數字（`priceFrom`），前台統一套用 `NT$ {數字} 起` 模板

## ⚠️ 部署帳號注意事項（2026-08-08）
這個網站是幫**客戶**做的，正式/測試環境都必須部署到**客戶自己的 Cloudflare 帳號**，不是開發者（johnny.shih1997@gmail.com）自己的帳號。
2026-08-08 曾經誤用開發者自己登入的 wrangler session 建立過一個測試用 Worker（`wuqiong-travel-test`）與 D1 資料庫（`travelproject-test`），事後已經完整刪除（`wrangler delete` + `wrangler d1 delete`，並確認帳號上沒有殘留）。
**之後任何 `wrangler deploy` / `wrangler d1 create` 之類會建立雲端資源的指令，動手前一定要先確認目前 wrangler 登入的是客戶的帳號，不是開發者自己的帳號**（用 `wrangler whoami` 確認）。

**已確認的客戶帳號**（2026-08-08 客戶親自在本機執行 `wrangler login` 授權）：
- Email：`nadia861130@gmail.com`
- Account ID：`d533ce3cc36dd35fbf18273d2db0d264`
- 之後在這台機器上部署 TravelProject，wrangler 登入的帳號應該都是這個；如果 `wrangler whoami` 顯示的不是這個帳號，代表登入狀態被換掉了，動手前要先確認/重新登入。

**已知 wrangler 帳號自動解析 bug**：這台機器上 `wrangler whoami` 顯示正確帳號，但部分指令（例如 `wrangler d1 create`）內部解析 account_id 時有時仍會抓到別的帳號（實測抓到過開發者自己的帳號 id）。因此 `wrangler.jsonc` 裡明確寫死 `"account_id": "d533ce3cc36dd35fbf18273d2db0d264"`，之後任何新增雲端資源的指令最好也明確帶上 `CLOUDFLARE_ACCOUNT_ID=d533ce3cc36dd35fbf18273d2db0d264` 環境變數，不要完全信任自動解析。

## 測試站部署狀態
已部署到客戶帳號：**https://wuqiong-travel.nadia861130.workers.dev**
- Worker 名稱：`wuqiong-travel`
- D1 資料庫：`wuqiong-travel`（id `a16f9442-c457-4ef8-b9d6-e082ae7b6efb`）
- **⚠️ 2026-08-12 現況：線上 D1 還停在 `0002_seed.sql` 的 schema，`0003`（地點/景點/SEO）、`0004`（媒體地點關聯）、`0005`（聯絡表單已讀）三支 migration 都還沒套用到正式環境**，本機開發用的是最新 schema，兩邊不同步。部署前務必先看 `IMPLEMENTATION_TASKS.md` TASK D5 的完整檢查清單（含備份步驟），不要直接跑 `npm run deploy`
- `wrangler.jsonc` 裡 `assets.run_worker_first: true` 是必要設定——沒設的話 Cloudflare 的靜態資源會攔截掉所有非首頁的 SSR 路由（`/about`、`/trips/[slug]` 等會變成 404，因為請求根本不會轉給 Worker 處理）
- `/admin` 目前依然完全沒有登入驗證，這是測試站，之後如果要給客戶正式使用一定要補 Cloudflare Access
- **R2 + Images binding 已接上**：`wuqiong-travel-media` bucket + `images` binding，後台上傳照片會真的壓縮（縮到最大寬 1600px、轉 webp、quality 75）存進 R2；本機開發沒有這些 binding，上傳會存到本機磁碟 `.data/uploads` 不壓縮，純供本機預覽用
- 後台 RWD 已驗證（手機寬度向下堆疊）

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

> 2026-08-12 更新：地點與景點已從 `tags` 拆成獨立實體（migration `0003`），詳細設計決策見 `SCHEMA_REDESIGN.md`。

- **`trips`**（行程樣板）：標題、slug、簡介、天數、`status`（draft / published）、`is_featured`、`rank`、`badge`（狀態標籤）、`seo_title`/`seo_description`（SEO 覆寫，留空自動用標題/簡介推導）
  - `status` 只在 trip 層級控管；trip 為 draft 時，底下所有 batch 一起隱藏，也不會進 sitemap
  - `is_featured` 精選首頁熱門行程，語意是「未來會出團的熱門行程」，非過去資料
  - 行程內容改為區塊化（見下方 `content_blocks`），不再是單一 tiptap 大欄位
- **`destinations`**（地點）+ **`trip_destinations`**（多對多）：兩層 `country → city`。取代原本 `tags.category='location'` 的做法。`is_domestic` 只設在 country 上，city 從 parent 繼承，是國內線／國外線分類的唯一來源。`is_primary` 決定行程麵包屑要顯示哪一條路徑（一個行程可能跨多城市，但麵包屑只能有一條）
- **`spots`**（景點）+ **`trip_spots`**（多對多）：取代原本 `tags.category='attraction'`。景點介紹與照片跨行程共用，改一次全站更新；有自己的 slug 與 landing page
- **`tags`** + **`trip_tags`**（多對多）：地點/景點拆出去後，只剩主題標籤（賞櫻／親子／美食…），移除了原本的 `category` 欄位
- **`batches`**（出團梯次）：`trip_id`、出發日期、班機、集合地點、成團人數、`price_from`（數字，前台統一套 `NT$ {數字} 起` 模板，也給 JSON-LD 用）、`price_info`（選填備註，早鳥價/兩人成行這類非制式說明，**不再承載價格本身**）
- **`content_blocks`** + **`content_snippets`**：行程內容改成區塊編輯（行程亮點／參考航班／每日行程／富文本），每個區塊獨立儲存；`content_snippets` 是可重複使用的範本庫，`mode='copy'` 插入時複製一份、`mode='reference'` 插入後仍與範本連動（**這個 reference 模式目前 schema 有但邏輯還沒做完**，見 `IMPLEMENTATION_TASKS.md` TASK B5）
- **`media`** + **`trip_images`** / **`media_destinations`** / **`media_spots`**：media 是共用媒體庫（存 r2_key），可同時掛在行程、地點、景點上，一張清水寺的照片可以同時出現在「清水寺」景點頁與「京都」地點頁的相簿
- **`contact_submissions`**：姓名、聯絡電話、Email（至少一種聯絡方式必填）、有興趣的行程（可選，關聯 trip）、留言內容、`is_read`

完整欄位定義以 `server/database/schema.ts`（Drizzle schema，含逐欄位設計註解）為準，這裡只列大致輪廓。

## 搜尋
- 資料量小（一年約 20 團），過濾直接在 JS 做，不寫複雜 SQL（與 D1 LIKE 效果相同，但邏輯集中好維護）
- `tag` 參數：精確比對，同時吃主題標籤／地點／景點的 slug 或 name，前台各種入口（主題卡、目的地頁、景點頁）共用同一支 API
- `q` 參數：模糊比對，關聯（tag/地點/景點的 name 與 slug）比對不到才 fallback 到標題/摘要/內文
- **不使用 FTS5**：規模小，現有做法已足夠；FTS5 是為大量文件/高頻查詢設計，先不需要

## SEO（2026-08-10 完成）
- `app/composables/usePageSeo.ts`：統一產生 `<title>`/meta description/OG/canonical，各頁面留空覆寫欄位就自動用標題/簡介推導
- JSON-LD：行程詳情頁輸出 `Product`/`Offer` 結構化資料，`offers.lowPrice` 讀 `batches.priceFrom`
- `server/routes/sitemap.xml.get.ts`：動態產生，涵蓋已發布行程 + 所有地點 + 所有景點 + 靜態頁，後台發布新行程不需要人工維護
- `server/routes/robots.txt.get.ts`：擋 `/admin` 與 `/api/`，指向 sitemap
- 後台頁面統一 `noindex, nofollow`（`app/layouts/admin.vue`），這是在補上 Cloudflare Access 之前的第二道防線，不是唯一防線

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

## 資料庫 migration 流程
- **正式環境（D1）**：改用 wrangler 內建的 migration 系統。`wrangler.jsonc` 的 d1_databases 設了 `migrations_dir`，wrangler 會在 D1 建 `d1_migrations` 表記錄已套用的檔案。
  - 部署指令 `npm run deploy` 已內含 `db:migrate`，會先套用未跑過的 migration 再 deploy，所以不會發生「程式碼上線但欄位還沒建」的錯誤。
  - 可安全重複執行，換任何一台電腦都不用記得跑到哪一支。
  - 新增欄位時：在 `server/database/migrations/` 加一支編號更大的 SQL 檔即可，**不要改動已套用過的檔案**（wrangler 用檔名判斷，改內容不會重跑）。
- **本機開發**：`server/plugins/db-init.ts` 在 dev server 啟動時跑 `ensureSchema()`（CREATE TABLE IF NOT EXISTS）+ `seed()`（有防重複守衛）。全新 clone 直接 `npm run dev` 就有完整的表與種子資料，不需要手動跑任何 SQL（`.data/` 已 gitignore）。
- **注意**：`server/utils/db.ts` 的 `ensureSchema()` 與 `migrations/*.sql` 是兩份各自維護的 schema，加欄位時**兩邊都要改**，否則會出現「本機正常、上線爆掉」。`applyLocalColumnMigrations()` 負責替既有的本機 DB 補新欄位。

## 待確認（新增，尚未實作）
- ~~國內線／國外線需要正式的資料欄位~~ —— **已解決（2026-08-10）**：改成 `destinations.is_domestic`（只設在 country 層級，city 從 parent 繼承），不再靠標籤名稱字串硬編碼，見 `server/utils/trips.ts` 的 `isDomesticTrip()`。完全沒掛地點的行程回傳 `null`，兩邊都不會出現（沿用原本「寧可漏掉也不要誤分類」的決策）。

- **行程瀏覽紀錄**：使用者想記錄訪客點過/查看過哪些行程（例如用於之後分析熱門行程、或做「最近瀏覽」功能）。目前完全沒有這塊機制。待確認的問題：
  - 目的是什麼？單純統計每個行程的瀏覽次數（trips 表加 view_count 即可），還是要看「同一個人看過哪些行程」（需要匿名訪客識別，例如 cookie/localStorage 存的 session id，沒有會員系統的情況下如何界定「同一人」）？
  - 要不要影響「當前熱門」的精選邏輯（目前 is_featured 是後台手動選的，之後會不會想改成依瀏覽量自動排序，或兩者併存）？
  - 資料保留多久、要不要做成後台可查看的報表？
  - 這件事還沒跟使用者 grill 過，之後要另外討論再決定資料表設計與實作方式。

## 相關舊專案（僅供技術棧參考，非同一個網站）
- `G:\PageWorker`：Cloudflare Worker + D1，攝影作品集網站（zhendoku.com）後端，架構可參考（分類/相簿/照片/標籤/批次刪除的實作模式），但資料模型跟旅行社無關，不要混用同一個 D1。
