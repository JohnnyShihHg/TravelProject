# DB Schema 重新設計（2026-08-10 設計稿，**已實作**）

> **狀態：已實作**（commit `219b869` 資料模型拆分、`97e0e05` 目的地/景點頁與 SEO、`20d7173` 後台補齊管理頁）。
> 下方內容維持設計當時的原文，作為決策依據保留；與最終實作的落差記在文件最後新增的「與最終實作的落差」一節。
> 正式環境的 D1 **尚未套用**對應的 migration（`0003`/`0004`/`0005`），部署前必看 `IMPLEMENTATION_TASKS.md` TASK D5。
> 背景討論見 `PLANNING_NOTES.md`。

## 設計原則

這個專案的規模限制決定了什麼叫「過度設計」：

- **一年約 20 團**、目前 6 筆行程 → 資料量極小，不需要為效能做任何設計
- **純展示型網站，無金流、無報名/成團機制**（`PLANNING_NOTES.md` 已確認）→ 任何庫存、席次、訂單模型都是過度設計
- **單人旅行社，無多人協作** → 不需要權限、審核流程、版本歷史
- 客戶專案，交付後由非技術人員維護 → **後台好填 > 資料庫漂亮**

因此每一個新欄位都要通過這個門檻：**現在就有具體用途，而不是「未來可能會用到」。**

判準是：如果一個欄位加了之後，短期內沒有任何畫面會顯示它、也沒有任何查詢會用到它，那它就會變成永遠是 NULL 的垃圾欄位 —— 不如不加。

---

## 一、核心問題：`tags` 表塞了三種不同的東西

現況 `tags` 只有 `{ id, name, category }`，`category` 有三個值：

| category | 實際內容 | 真正的性質 |
|---|---|---|
| `location` | 日本、東京、京都、北海道、韓國、台灣 | **有階層的地理實體**（日本 ⊃ 京都） |
| `attraction` | 富士山、清水寺、101 | **有屬性的景點**（地址、座標、營業時間、照片） |
| `type` | 賞櫻、賞楓、親子、美食、深度旅遊 | **真正的標籤**（扁平、只有名字） |

只有 `type` 是名副其實的標籤。另外兩種被硬塞進標籤模型，造成三個具體問題：

1. **`日本` 和 `京都` 之間沒有任何關聯** → 無法做麵包屑、無法做「日本的所有行程」
2. **`清水寺` 只有一個名字** → 地址、介紹、照片無處可放，只能重複寫在每個行程的 HTML 裡
3. **國內線/國外線只能靠標籤名稱硬編碼**（`server/api/trips/index.get.ts` 的 `DOMESTIC_LOCATIONS`）→ `PLANNING_NOTES.md` 已列為待修

**解法：把 `tags` 拆成三張表，各自符合它真正的性質。**

```
tags (category: location) ──→ destinations   有階層的地理實體
tags (category: attraction) ─→ spots          有屬性的景點
tags (category: type) ───────→ tags           留下，成為單純的主題標籤
```

這不是增加複雜度，而是**把已經存在的三個概念從一張擠壓的表裡分開**。而且正好對應側邊欄想要的 Countries / Cities / Places / Categories。

---

## 二、目標 schema 全貌

```
                        ┌─────────────┐
                        │ destinations│  自我參照階層
                        │ 日本 ⊃ 京都  │  type: country | city
                        └──────┬──────┘
                               │ parentId
                    ┌──────────┴──────────┐
                    ↓                     ↓
              ┌──────────┐          ┌──────────┐
              │  spots   │          │  trips   │
              │  清水寺   │          │   行程    │
              └────┬─────┘          └────┬─────┘
                   │                     │
                   │  trip_spots         ├── batches       出團梯次
                   └─────────────────────┤
                                         ├── trip_tags ──→ tags  主題標籤
                                         ├── trip_images ─→ media 照片
                                         └── content_blocks      內容區塊
                                                  │
                                                  └─ daily_itinerary
                                                     每天的 spotIds → spots
```

---

## 三、逐項變更

### 新增 `destinations`（取代 location tags）

```ts
export const destinations = sqliteTable('destinations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),          // japan, kyoto
  name: text('name').notNull(),                    // 日本、京都
  type: text('type', { enum: ['country', 'city'] }).notNull(),
  parentId: integer('parent_id').references((): any => destinations.id, { onDelete: 'set null' }),
  isDomestic: integer('is_domestic', { mode: 'boolean' }).notNull().default(false),
  description: text('description'),                // landing page 介紹文
  coverMediaId: integer('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
  rank: integer('rank').notNull().default(0),
  createdAt: ...
})
```

| 欄位 | 為什麼需要 |
|---|---|
| `slug` | `/destinations/kyoto`。用 `name` 會變成 `%E4%BA%AC%E9%83%BD`，不利 SEO |
| `type` | 側邊欄要分「國家 / 城市」兩個選單；麵包屑要知道層級 |
| `parentId` | 京都 → 日本。麵包屑與「日本的所有行程」都靠它 |
| `isDomestic` | **取代 `DOMESTIC_LOCATIONS` 硬編碼**。只設在 country 上，city 從 parent 繼承 |
| `description` / `coverMediaId` | landing page 要有內容，否則是空殼頁（對 SEO 反而有害） |

**只有 country 和 city 兩層 —— 不做 region/州/省。** 「北海道」在這個專案裡當 city 用即可。真的遇到再加，加一個 enum 值是零成本的。

> **關於 `isDomestic`：** `PLANNING_NOTES.md` 原本規劃的是 `trips.region: 'domestic' | 'overseas'`。改放在 destination 上更好 —— 行程的國內外屬性本來就是「它去哪個國家」的結果，放在 trip 上是把同一件事記兩次，會有不一致的風險（標籤掛日本、region 填 domestic）。設在國家上只需維護一次。

### 新增 `spots`（取代 attraction tags）

```ts
export const spots = sqliteTable('spots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),           // kiyomizu-dera
  name: text('name').notNull(),                     // 清水寺
  destinationId: integer('destination_id').references(() => destinations.id, { onDelete: 'set null' }),
  description: text('description'),                 // 共用簡介，改一次全站更新
  address: text('address'),
  lat: text('lat'),
  lng: text('lng'),
  coverMediaId: integer('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
  createdAt: ...
})

export const tripSpots = sqliteTable('trip_spots', {
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  spotId: integer('spot_id').notNull().references(() => spots.id, { onDelete: 'cascade' })
})
```

**這是這次改動的核心價值：**
- 「清水寺」的介紹、照片、地址**寫一次**，所有行程共用（現在散在各行程的 HTML 字串裡）
- `/spots/kiyomizu-dera` landing page → 長尾 SEO 入口
- 反向查詢「哪些行程會去富士山」現在做不到
- `lat`/`lng` 之後可以畫行程地圖

**刻意不加的欄位：**
- ~~`openingHours`~~ —— 之前討論有提到，但旅行社不會維護景點營業時間（那是景點官方的事），加了就是永遠空的欄位。**移除**
- ~~`nameOriginal`（日文原名）~~ —— 前台目前沒有任何地方要顯示原文名。要用再加

**`lat`/`lng` 用 `text` 不用 `real`：** SQLite/D1 的浮點數精度處理在這裡沒有好處，而且座標只會原樣輸出給地圖 API，字串更安全。

### `tags` 收斂成純主題標籤

```ts
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),   // 新增：cherry-blossom
  name: text('name').notNull().unique(),   // 賞櫻
  // category 移除 —— 只剩一種了
})
```

`category` 欄位在拆分後**只會有 `type` 一個值，直接移除**。留著一個永遠是同一個值的欄位沒有意義。

`slug` 是為了之後可能的 `/tags/cherry-blossom` 頁面。這個頁面**不在這次範圍內**，但 slug 現在加成本是零（6 筆資料），之後補則要回頭寫 migration。

### `trips` 加 SEO override

```ts
seoTitle: text('seo_title'),              // 空 → 自動用 title
seoDescription: text('seo_description'),  // 空 → 自動用 summary
```

兩欄都是 **nullable override**，不是必填。編輯者不填也能有正確的 meta。

**不加的：**

| 欄位 | 不加的理由 |
|---|---|
| `ogTitle` / `ogDescription` | 繼承 SEO 版即可，不要逼編輯填第三次 |
| `ogImageId` | 先用 `trip_images.isCover` 的封面。等真的遇到 1200×630 裁切問題再加 |
| `canonical` | 由程式自動產生。ChatGPT 也同意只有特例才需要 override |
| `noindex` | 已經有 `status: draft/published`。真的出現「已上線但不想被搜到」的包團頁再加 |
| `keywords` | Google 早已完全忽略 |

### `batches` 加 `priceFrom`

```ts
priceFrom: integer('price_from'),   // 42900，純數字
```

**唯一理由是 JSON-LD 的 `Offer.price` 必須是數字。** 現有的 `priceInfo`（`"NT$42,900 成人"`）是字串，無法用於結構化資料，但它在前台顯示得很好（`TripDetailView.vue:54`），**完全保留不動**。

這是「同一份資料兩種用途」的合理重複，不是正規化不足。後台就是價格旁多一個數字欄位。

**不加的：** `capacity` / `bookedCount` / `status(open|full|closed)`。專案明確定義為**無報名機制**，這些欄位沒有任何東西會去更新它們，加了就是永遠是 0 的裝飾品。

### `daily_itinerary` 維持原樣，**不加 `spotIds`**（2026-08-10 修正）

```ts
interface DailyItineraryDay {
  day: number
  title: string
  html: string          // ← 純文字敘事，維持不變
  meals: { breakfast, lunch, dinner }
  hotel: string
}
```

**每日行程是「當次行程」的「某一天」，本質上不可重複使用。** 同樣走東京，A 團是東京→富士山、B 團是富士山→東京，敘述內容完全不同。所以 `html` 純文字是正確的設計，不要試圖結構化它：

> 「早餐後前往清水寺，沿途漫步二年坂三年坂，午後於祇園花見小路感受古都風情。」

真正可重複使用的是**景點實體本身**（富士山、淺草寺），那由 `spots` 表處理。

**原設計稿提議的每日層級 `spotIds` 已移除。** 理由：
- 行程層級的 `trip_spots` 已足以支撐兩個主要價值 —— 景點 landing page、反向查詢「哪些行程會去富士山」
- 每日層級要編輯者**逐天**標記景點，增加填寫負擔，但目前**沒有任何畫面會顯示它**
- `daily_itinerary` 存在 `content_blocks.data` 的 JSON 裡，**JSON 形狀之後要加欄位是零遷移成本**（不像 DB 欄位），延後是免費的

> **未實作的想法（保留紀錄）：** day 卡片下方自動顯示那天提到的景點小卡介紹（例：day1 走淺草寺→晴空塔，卡片下方帶出淺草寺簡介）。這才需要每日層級的 `spotIds`。等真的要做時再加。

### `content_snippets` / `content_blocks` 加引用模式

```ts
// content_snippets
mode: text('mode', { enum: ['copy', 'reference'] }).notNull().default('copy'),

// content_blocks
snippetId: integer('snippet_id').references(() => contentSnippets.id, { onDelete: 'set null' }),
```

現況是**插入時複製**（`from-snippet.post.ts:20` 有註解說明，是刻意的）。保留 copy 作為預設，額外支援 reference：

| 內容性質 | 模式 | 例子 |
|---|---|---|
| 制式條款，改一次全站生效 | `reference` | 退稅說明、行李限制、取消政策 |
| 起手模板，插入後要改寫 | `copy`（現況、預設） | 每日行程骨架、航班格式 |

`snippetId` 有值 → 渲染時讀範本，後台顯示唯讀 + 「解除連結」按鈕。

> **這項可以往後延。** 它不阻擋其他任何工作，且現在只有少量範本。如果想讓第一批改動更小，可以從這次範圍拿掉。

### `media.url` 註解修正

```ts
url: text('url').notNull(), // local: placeholder url, prod: r2 public url  ← 錯的
```

`server/utils/media.ts:50,57` 兩個分支都回傳 `/media/${key}`，是應用程式自有路由，**沒有綁死 R2 public URL**。這行註解已過時且會誤導（實測讓 AI 誤判專案有遷移風險）。

**只改註解，不動欄位。** `url` 雖然對 `r2Key` 冗餘，但移除要改所有讀取處，沒有使用者可見的好處 —— 不值得。

---

## 四、明確不做的清單

| 項目 | 為什麼不做 |
|---|---|
| **`articles` 文章系統** | 側邊欄概念有列，但目前**沒有任何文章需求**。整套 CMS（分類、作者、發布時程）是最大的過度設計風險。等真的要寫遊記再說 |
| **`videos`** | 側邊欄有列，但目前完全沒有影片功能。`media` 表要支援影片只需加一個 `type` 欄位，等有需求再加 |
| **batches 席次/報名模型** | 專案定義為純展示無報名 |
| **`priceInfo` 拆成結構化價格** | 成人/兒童/房差/早鳥。目前只原樣顯示，`priceFrom` 已足夠應付 JSON-LD |
| **`trips.days` 改動** | 只在 `TripCard.vue:36` 顯示成「5 天」，是產品天數不是計算值。加註解說明即可 |
| **`hero_content` singleton 約束** | `hero.put.ts` 已用 `.get()` upsert 保證，DB 加約束無實益 |
| **destinations 三層以上階層** | country + city 兩層夠用 |
| **行程瀏覽紀錄** | `PLANNING_NOTES.md` 列為待確認，需求還沒釐清，不在這次範圍 |

---

## 五、遷移策略

### ⚠️ Schema 必須同步改三個地方

`PLANNING_NOTES.md` 已警告過這個陷阱，這次改動大，特別容易踩：

1. `server/database/schema.ts` — drizzle 定義
2. `server/utils/db.ts` — `ensureSchema()` 的 CREATE TABLE + `applyLocalColumnMigrations()` 的 ALTER
3. `server/database/migrations/0003_*.sql` — D1 正式環境

漏掉任一個 → 「本機正常、上線爆掉」。

### 資料遷移步驟（0003 migration）

```sql
-- 1. 建新表 destinations / spots / trip_spots
-- 2. location tags → destinations
--    日本/韓國 → type=country, isDomestic=0
--    台灣      → type=country, isDomestic=1
--    東京/京都/北海道 → type=city, parentId=日本
-- 3. attraction tags → spots（帶上 destinationId）
-- 4. trip_tags 中指向 attraction tag 的列 → trip_spots
-- 5. trip_tags 中指向 location tag 的列 → trips.destination 關聯
-- 6. 刪除已遷移的 tags 列，移除 tags.category 欄位，加上 tags.slug
-- 7. trips 加 seo_title / seo_description
-- 8. batches 加 price_from
```

**slug 需要人工指定**（`日本` → `japan`、`清水寺` → `kiyomizu-dera`），資料量小（6 個地點 + 3 個景點），直接寫死在 migration 裡。

### 行程與地點的關聯方式

一個行程可能跨多個城市（大阪進、京都玩、東京出）。維持 **M:N**：

```ts
export const tripDestinations = sqliteTable('trip_destinations', {
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  destinationId: integer('destination_id').notNull().references(() => destinations.id, { onDelete: 'cascade' }),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false)
})
```

`isPrimary` 決定麵包屑顯示哪一個（`首頁 › 日本 › 京都 › 京都賞楓六日`）。沒有它就無法決定唯一麵包屑路徑。

### 風險

**低。** 本機刪 `.data/` 重跑即可；D1 上目前只有假資料（`PLANNING_NOTES.md`：「目前 6 筆行程都是假資料」），最壞情況重建。**現在做正是最便宜的時機。**

---

## 六、對後台 UI 的影響（Task #7 才實作）

新 schema 直接對應側邊欄概念：

| 側邊欄項目 | 對應資料表 | 狀態 |
|---|---|---|
| 行程 Tours | `trips` | 既有 |
| 景點 Places | `spots` | **新增** |
| 城市 Cities | `destinations` (type=city) | **新增** |
| 國家 Countries | `destinations` (type=country) | **新增** |
| 分類 Categories | `tags` | 既有，需新增管理頁 |
| 文章 Articles | — | **不做** |
| Images | `media` | 既有 |
| Videos | — | **不做** |
| Homepage | `hero_content` | 既有 |
| Navigation / Footer | — | 目前寫死在元件，不進 CMS |

行程編輯器要新增的兩處：
- **每日行程**：文案編輯器下方加景點多選（從 `spots` 挑，可即時新增）
- **SEO 區塊**：預設摺疊，placeholder 顯示自動推導值 + Google 搜尋結果預覽

---

## 七、改動總表

| 表 | 動作 |
|---|---|
| `destinations` | 🆕 新增 |
| `spots` | 🆕 新增 |
| `trip_spots` | 🆕 新增 |
| `trip_destinations` | 🆕 新增 |
| `tags` | ✏️ 移除 `category`，新增 `slug` |
| `trips` | ✏️ 新增 `seo_title`、`seo_description` |
| `batches` | ✏️ 新增 `price_from` |
| `content_snippets` | ✏️ 新增 `mode`（可延後） |
| `content_blocks` | ✏️ 新增 `snippet_id`（可延後） |
| `media` | 💬 只修註解 |
| `trip_images` / `hero_content` / `contact_submissions` | ✅ 不動 |

---

## 八、與最終實作的落差（2026-08-12 補記）

Schema 層面（本文件第七節「改動總表」）與實際落地的表結構一致，`destinations`/`spots`/`trip_destinations`/`trip_spots` 都照設計新增，`tags` 也照設計收斂。但**兩個地方後續的產品決策跟這份設計稿的原始理由不一樣**：

1. **`priceFrom` 的定位反過來了。** 本文件第三節（177 行起）設計時的立場是「`priceInfo` 完全保留不動、是前台主要顯示，`priceFrom` 純粹是為了 JSON-LD 才加的數字副本」。但 2026-08-12 使用者直接要求「費用改成只填數字」，於是**顛倒**成 `priceFrom` 是唯一價格來源、前台統一套 `NT$ {數字} 起` 模板，`priceInfo` 降格為選填備註（早鳥價/兩人成行這類非制式說明）。這不是這份設計稿沒想到，是後來的需求本身變了 —— 「同一份資料兩種用途」的判斷在客戶決定固定顯示格式後就不成立了。

2. **`content_snippets.mode='reference'` 仍是本文件第 233 行標注的「可以往後延」狀態，而且確實被延了。** schema 的 `mode` 欄位與 `content_blocks.snippet_id` 都已建立，但 `from-snippet.post.ts` 至今沒有讀 `mode`、也沒有寫入 `snippetId`，一律走 `copy`。這不是遺漏，是 TASK B5 明確記錄「先跳過，等其他 Phase 做完再問使用者要不要做」的延後決定，跟設計稿當初的判斷一致，只是延後的時間比預期長。

其餘章節（地點/景點的階層設計、SEO 欄位、daily_itinerary 不加 spotIds 的決定）都與最終實作相符，沒有落差。

**4 張新表、5 張表加欄位、1 處註解。**
