# TravelProject 實作任務書

> 撰寫日期：2026-08-12
> 基準 commit：`20d7173`（工作目錄乾淨，以下所有任務皆未開始）
> 執行者：Claude Sonnet 5
>
> **執行進度（2026-08-12）**：Phase A（`d9cbf26`）、Phase B（`e123929`，B5 依建議跳過）、
> Phase C（`6614fce`）已完成並驗證。Phase D 進行中：D1/D2/D3 已完成，D4（Cloudflare Access）
> 與 D5（部署清單）需要使用者本人操作或確認，尚未執行。

---

## 0. 給執行者的作業規則（先讀完再動手）

1. **一次只做一個 TASK。** 完成一個就停下來回報，等使用者確認後再進下一個。不要一口氣做完整個 Phase。
2. **順序不可跳。** Phase A → B → C → D。B 會改動 slug 與價格欄位的資料流，C 的 UI 建立在 B 之上；先做 C 會白工。
3. **不寫測試。** 本專案不做 TDD。唯一例外是「會靜默毀掉既有資料」的地方（migration、批次修資料腳本）——那種一定要先在本機 SQLite 跑一次驗證再碰 D1。
4. **migration 絕對不准 `DROP TABLE`。** schema 有多個 `ON DELETE CASCADE` 外鍵，DROP 掉主表會靜默清空 `trip_tags` / `trip_destinations` / `trip_spots` / `batches` / `content_blocks`。要改欄位就新增 migration 檔用 `ALTER TABLE ADD COLUMN`，或先把關聯資料 SELECT 出來再重建。改完務必跑 `npm run db:verify`。
5. **不要碰部署。** 任何 `wrangler deploy` / `wrangler d1 ... --remote` 都要先問使用者。目前登入的 Cloudflare 帳號可能不是客戶帳號。
6. **commit 訊息沿用現有風格**：中文、`feat:` / `fix:` / `docs:` 前綴，例如 `fix: 行程編輯器捲到底時 SEO 階段正確高亮`。每個 TASK 一個 commit。
7. **驗證方式**：`npm run dev` 起本機站（用本機 SQLite，不碰 D1），實際點過受影響的頁面。改到 server API 時順手 `npx nuxt typecheck` 或看 dev server 有沒有紅字。
8. **不要自作主張擴大範圍。** 看到旁邊還有別的問題就記下來寫進回報，不要順手改。

---

# Phase A — Bug 修復（4 項）

先把使用者實測回報的壞掉行為修掉。這一階段全部是小改動，不動資料結構。

---

## TASK A1 ✅ — 行程編輯器捲到最底時「⑥ SEO」階段不會高亮

**檔案**：`app/components/admin/StageNav.vue`

**現象**：在 `/admin/trips/[id]` 一路捲到頁面最底，上方階段列的高亮停在「⑤ 照片」，永遠跳不到「⑥ SEO」。

**根因**（已確認）：`StageNav.vue:30` 的 IntersectionObserver 設定

```js
{ rootMargin: '-120px 0px -55% 0px', threshold: 0 }
```

下緣的 `-55%` 把視窗底部 55% 劃成忽略區。捲到頁面最底時，`#stage-seo` 整段落在那 55% 裡，`isIntersecting` 為 false，於是 callback 的 `visible[0]` 永遠取不到它。這是所有「最後一段」都會踩到的結構性問題，不是 SEO 段特有的。

**修法**：保留 IntersectionObserver 當主要機制（不要改回 scroll 事件），另外加一個「捲到底就強制高亮最後一段」的覆寫。

具體做法：
1. 在 `onMounted` 內另外掛一個 `scroll` 監聽（用 `{ passive: true }`）。
2. 判斷式：`window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2`（留 2px 容差，避免瀏覽器次像素捨入時判不到）。
3. 成立時 `activeId.value = props.stages[props.stages.length - 1]!.id`，不成立時什麼都不做（讓 observer 繼續管）。
4. `onBeforeUnmount` 要一併 `removeEventListener`，不要只 disconnect observer。

**驗證**：`/admin/trips/1` 慢慢捲到最底 → 高亮應落在「SEO」；往回捲一點 → 應自動回到「照片」。

---

## TASK A2 ✅ — 聯絡表單「已讀 / 未讀」被誤讀成相反

**檔案**：`app/pages/admin/contacts.vue`

**先講清楚：程式邏輯是對的，不要把高亮反過來。**
`contacts.vue:71` 的 `c.isRead ? 'border-gray-100' : 'border-primary/30 bg-primary/5'` —— 未讀才高亮，這是正確的。

**真正的問題**在 `contacts.vue:87`：按鈕文字是 `{{ c.isRead ? '標為未讀' : '標為已讀' }}`。那是**動作**，但視覺上它就是一顆掛在卡片右上角的小灰標，使用者讀成**狀態**。於是已讀的那列寫著「標為未讀」，看起來像在宣告「這筆未讀」，跟高亮完全打架。

**修法**：把狀態與動作分開呈現。

1. 在建立時間左邊（或名字右邊）加一顆**狀態 chip**，只表示狀態、不可點：
   - 未讀 → `<UBadge color="primary" variant="subtle" size="sm">未讀</UBadge>`
   - 已讀 → `<UBadge color="neutral" variant="subtle" size="sm">已讀</UBadge>`
2. 原本那顆按鈕改成**圖示按鈕**，文字移到 `title` / `aria-label`：
   - 已讀時 → `icon="i-lucide-mail"`，`aria-label="標為未讀"`
   - 未讀時 → `icon="i-lucide-mail-open"`，`aria-label="標為已讀"`
3. `contacts.vue:75` 那顆藍點跟新的 chip 重複了，把藍點移除，避免同一個資訊講兩次。

**驗證**：手上有已讀也有未讀的資料時，掃一眼就能分辨，且點按鈕後 chip 與底色同時翻轉。

---

## TASK A3 ✅ — 後台頁面沒有 `<title>`

**檔案**：`app/layouts/admin.vue`（主要）＋各 `app/pages/admin/*.vue`

**現象**：Lighthouse 對 `/admin` 報 `Document doesn't have a <title> element`。瀏覽器分頁顯示的是網址，開多個後台分頁分不出誰是誰。

**影響**：不影響 SEO（後台本來就 `noindex`，`/admin` 的 SEO 分數 45 是預期值，**不要為了衝這個分數把 noindex 拿掉**）。純粹是後台自用的可用性問題。

**修法**：
1. `app/layouts/admin.vue:4` 目前只設了 `robots`。把它改成同時給一個預設標題：
   ```ts
   useSeoMeta({ robots: 'noindex, nofollow', title: '後台管理｜無穹旅行社' })
   ```
2. 各後台頁在自己的 `<script setup>` 裡覆寫成更具體的標題（layout 的當 fallback）：
   - `admin/index.vue` → `行程管理`
   - `admin/spots/index.vue` → `景點管理`
   - `admin/destinations/index.vue` → `目的地管理`
   - `admin/tags/index.vue` → `主題標籤`
   - `admin/media/index.vue` → `圖片庫`
   - `admin/hero.vue` → `首頁 Hero`
   - `admin/contacts.vue` → `聯絡表單留言`
   - `admin/trips/new.vue` → `新增行程`
   - `admin/trips/[id]/index.vue` → 用行程標題，動態：`useSeoMeta({ title: () => \`編輯：${trip.value?.title ?? ''}\` })`
   - `admin/trips/[id]/preview.vue` → `預覽`
3. 標題統一格式 `${頁名}｜無穹旅行社 後台`。可以在 layout 用 `titleTemplate` 統一加尾綴，各頁只寫頁名。

**驗證**：開兩個後台分頁（例如行程管理＋圖片庫），分頁標題不同且看得懂。

---

## TASK A4 ✅ — 刪除行程後導向不存在的 `/admin/trips`（404）

**檔案**：`app/pages/admin/trips/[id]/index.vue:158`

**現象**（本次程式碼審查發現，尚未經使用者實測）：`removeTrip()` 刪完後 `await router.push('/admin/trips')`，但**專案裡沒有 `/admin/trips` 這一頁**——行程列表目前還在 `/admin` 儀表板上（`app/layouts/admin.vue:29` 的註解也是這樣寫的）。刪除後會掉到 404。

**修法（現在）**：把 `router.push('/admin/trips')` 改成 `router.push('/admin')`。一行改動。

**注意**：TASK C7 會真的建出 `/admin/trips` 獨立列表頁。做到 C7 時要記得把這裡改回 `/admin/trips`。C7 的驗收清單裡已經列了這條。

---

# Phase B — 資料庫與資料正確性（5 項）

這一階段動的是資料的形狀與寫入路徑，**是整份任務書風險最高的部分**。每個 TASK 動手前先在本機 SQLite 驗證一次。

---

## TASK B1 ✅ — 統一 slugify，移除 `trips/index.post.ts` 的私有版本

**檔案**：`server/api/admin/trips/index.post.ts:13-19`

**問題**：專案裡有兩份 slugify，行為衝突。

- `server/utils/slug.ts:11` —— 官方版。只留 `a-z0-9`，中文名會轉出空字串，交給呼叫端用 `fallbackSlug()`。`destinations` 與 `spots` 的 POST 都用這份。
- `server/api/admin/trips/index.post.ts:13` —— 私有版。regex 是 `/[^a-z0-9一-鿿]+/g`，**刻意保留中文**。

私有版產生的中文 slug 會變成 URL-encoded 網址。**實測已出現壞資料**：使用者建立的行程 slug 是 `北江`，前台網址成了 `/trips/%E5%8C%97%E6%B1%9F`。對 SEO 不利，分享出去的連結也醜。

**修法**：
1. 刪掉 `index.post.ts:13-19` 的私有 `slugify`。
2. 改 import `server/utils/slug.ts` 的 `slugify` / `fallbackSlug` / `ensureUniqueSlug`，比照 `destinations/index.post.ts` 的寫法：
   ```ts
   const slug = await ensureUniqueSlug(
     body.slug?.trim() || slugify(body.title) || fallbackSlug('trip'),
     async s => !!(await db.select({ id: trips.id }).from(trips).where(eq(trips.slug, s)).get())
   )
   ```
3. 順手把現有的「撞名就丟 409」改成 `ensureUniqueSlug` 的加序號行為 —— 但**只在 slug 是自動產生時**這樣做。使用者**手動指定**的 slug 撞到了還是要丟 409，否則他以為存成 `tokyo-5days`、實際變成 `tokyo-5days-2`，這種靜默改寫比報錯更糟。

**驗證**：後台建一個純中文標題的行程（例如「北江秘境三日」），確認產生的是 `trip-xxxxx` 這種 fallback slug 而不是中文。

---

## TASK B2 ✅ — 行程 slug 建立後可以編輯

**檔案**：`server/api/admin/trips/[id].patch.ts`、`app/pages/admin/trips/[id]/index.vue`

**問題**：slug 一旦建立就改不了。API 不支援（`[id].patch.ts:6-21` 的 `UpdateTripBody` 沒有 `slug`），後台右欄 `index.vue:496-502` 也只是唯讀顯示。B1 之後新行程 slug 會正常，但**已經存在的壞資料（`北江`）沒有任何介面能修**。

**修法 —— 後端先做**（`server/api/admin/trips/[id].patch.ts`）：
1. `UpdateTripBody` 加 `slug?: string`。
2. 處理邏輯放在其他欄位之前：
   ```ts
   if (body.slug !== undefined) {
     const next = body.slug.trim()
     if (!next) throw createError({ statusCode: 400, statusMessage: '網址代稱不能留空' })
     // 只允許小寫英數與連字號 —— 這是修中文 slug 壞資料的入口，不能再放中文進來
     if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(next)) {
       throw createError({ statusCode: 400, statusMessage: '網址代稱只能用小寫英文、數字與連字號' })
     }
     if (next !== existing.slug) {
       const dup = await db.select({ id: trips.id }).from(trips).where(eq(trips.slug, next)).get()
       if (dup) throw createError({ statusCode: 409, statusMessage: '這個網址代稱已經被使用' })
       updates.slug = next
     }
   }
   ```
   注意：**這裡不要用 `ensureUniqueSlug` 自動加序號**。使用者是手動指定的，撞到就要報錯讓他自己決定。

**修法 —— 前端**（`app/pages/admin/trips/[id]/index.vue` 右欄「網址代稱」區塊，第 496-502 行）：
1. 把唯讀的 `<p>` 換成可編輯狀態，但**預設維持唯讀顯示**，旁邊一顆小的鉛筆圖示按鈕才切成輸入框 —— 改 slug 會讓舊網址 404，不該像改標題那樣隨手可動。
2. 輸入框前面固定顯示 `/trips/` 前綴（灰字，非輸入內容）。
3. 加一行明確警語：`改網址會讓舊連結失效，已經分享出去的連結會找不到頁面。`
4. slug 併進既有的 `save()` 一起送（`form` 加 `slug` 欄位，`watchEffect` 裡同步 `form.slug = trip.value.slug`）。**不要另外做一顆獨立的儲存按鈕**，會讓右欄出現兩顆儲存、使用者搞不清誰管誰。
5. `save()` 的 catch 已經會顯示 `statusMessage`，409 / 400 會自動呈現，不用另外寫。

**驗證**：
- 把壞掉的 `北江` 那筆改成 `beijiang-3days`，存檔後前台 `/trips/beijiang-3days` 開得起來。
- 故意填中文 → 應報「只能用小寫英文、數字與連字號」。
- 故意填一個已存在的 slug → 應報 409。

---

## TASK B3 ✅ — 費用改成只填數字，前台套固定模板

**檔案**：`app/pages/admin/trips/[id]/index.vue`、`app/components/TripDetailView.vue`、`server/api/admin/trips/[id]/batches.post.ts`、`server/api/admin/batches/[id].patch.ts`

**需求**：使用者要求「費用說明改成只填數字」，前台一律顯示 `NT$ {數字} 起`（客戶都是台幣付款）。

**設計決策（已定案，照做即可）**：
目前 `batches` 有兩欄：`priceInfo`（自由文字，給人看）與 `priceFrom`（數字，給 JSON-LD）。

**採用方案：`priceFrom` 成為唯一的價格來源；`priceInfo` 降格為選填備註，不再承載價格。**

理由：真的存在非制式說明（早鳥價、兩人成行、寒暑假加價），全砍掉客戶會沒地方寫。但價格顯示必須統一，不能讓客戶自己打字打出五種格式。

具體規則：
- 前台主價格 = `NT$ ${priceFrom.toLocaleString('zh-TW')} 起`，只由 `priceFrom` 產生。
- `priceInfo` 改名（僅 UI 標籤，欄位名不動）為「**費用備註（選填）**」，前台顯示在主價格下方，小字、次要色。留空就不顯示。
- **不要下 migration 刪 `price_info` 欄位。** 見作業規則 4 —— 這張表有 CASCADE 關聯，且欄位留著零成本。既有假資料裡的 `"NT$ 42,900 起"` 字串留在那也無妨，因為前台不再讀它當價格。

**改動清單**：
1. `app/pages/admin/trips/[id]/index.vue:378-383`：
   - 「費用說明」欄位標籤改成「費用備註（選填）」，`help` 改成「早鳥價、兩人成行這類補充說明。價格不要寫在這裡。」，placeholder 改成「例如：早鳥報名折 2,000」。
   - 「價格數字」欄位改成必填感的呈現：標籤改「每人費用（新台幣）」，`help` 改「只填數字。前台會顯示成 NT$ 42,900 起」，加上即時預覽小字顯示套完模板的樣子。
   - 兩個欄位的排列對調 —— 價格數字在前，備註在後。
2. `app/components/TripDetailView.vue:66-67`（浮動 bar）與 `:155-156`（梯次卡片）：
   - 主價格改讀 `priceFrom`，套模板輸出。建議寫一個 `formatPrice(n: number | null)` 的小 helper 放在同檔案 script 裡，兩處共用。
   - `priceInfo` 有值時，在主價格下方以 `text-xs text-gray-500` 呈現。浮動 bar 空間窄，**bar 上只顯示主價格，備註不顯示**。
3. `server/api/admin/trips/[id]/batches.post.ts` 與 `batches/[id].patch.ts`：兩支都要能寫入 `priceFrom`。目前 `batches.post.ts:28` 只寫了 `priceInfo`，**`priceFrom` 根本沒被寫入** —— 後台表單填了數字也存不進去。這是既有 bug，一併修掉。
4. `app/pages/admin/trips/[id]/index.vue:350` 的梯次列表也改成顯示套完模板的價格。

**驗證**：新增一筆梯次只填數字 `42900` → 前台詳情頁與浮動 bar 都顯示 `NT$ 42,900 起`；`/trips/[slug]` 的 JSON-LD `offers.lowPrice` 有值。

---

## TASK B4 ✅ — 修掉 `listPublishedTrips` 的 N+1 查詢

**檔案**：`server/utils/trips.ts:154-157`

**問題**：Lighthouse 報「Document request latency 可省 1,070ms」。根因在這裡：

```ts
export async function listPublishedTrips(db: DB) {
  const rows = await db.select().from(trips).where(eq(trips.status, 'published')).all()
  return Promise.all(rows.map(trip => enrichTrip(db, trip)))
}
```

`enrichTrip`（`trips.ts:107`）對每個行程各發 5 個查詢（tags / destinations / spots / batches / images）。6 個行程 = 1 + 6×5 = **31 次 D1 往返**。D1 每次查詢都有網路延遲，`Promise.all` 也救不了，因為 Workers 對同一個 D1 binding 的請求會排隊。

**修法**：改成「一次撈全部再在記憶體 group by」。

1. 在 `server/utils/trips.ts` 新增一支 `listPublishedTripsBatched(db)`（或直接改寫 `listPublishedTrips`）：
   - 先撈 published 的 trips，取出 `ids`。
   - 用 `inArray(tripTags.tripId, ids)` 等 5 個查詢，一次把所有關聯撈回來（每個查詢的 JOIN 條件與現有的 `getTripTags` / `getTripDestinations` / … 完全一致，只是 `where` 從 `eq(..., tripId)` 換成 `inArray(..., ids)`，並且 select 多帶一個 `tripId` 欄位好 group）。
   - 在記憶體用 `Map<number, T[]>` group by `tripId`，再組出跟原本 `enrichTrip` **完全相同形狀**的物件。
   - 總查詢數：1 + 5 = **6 次**，與行程數無關。
2. `ids` 為空時要提早 return `[]`，`inArray` 吃空陣列在部分 driver 會產生無效 SQL。
3. **`enrichTrip` 本身不要動。** `enrichTripDetail`（單一行程詳情頁）還在用它，那裡 N+1 不成立、改了只會增加風險。
4. 回傳物件的欄位、排序、`coverImageUrl` / `nextBatch` / `primaryDestination` 的推導規則都必須跟舊版一模一樣。`destinations` 的 `parent` 巢狀結構（`trips.ts:43-48`）特別容易漏，注意。

**驗證**（這一項務必實測，不能只看程式碼）：
- `npm run dev`，開 `/` 與 `/trips`，畫面上的行程卡片內容、地點小字、最近出團日期、主題標籤都要跟改動前一致。
- `/trips?tag=賞櫻`、`/trips?scope=domestic`、`/trips?q=京都` 三種篩選都要照舊運作（`server/api/trips/index.get.ts` 是在 `listPublishedTrips` 的結果上做過濾的）。
- 建議在改動前先把 `/api/trips` 的 JSON 回應存一份到 scratchpad，改完後 diff 比對，最保險。

---

## TASK B5 — snippet 的 `reference` 模式（可延後，做完 B1-B4 再評估）

**檔案**：`server/api/admin/trips/[id]/blocks/from-snippet.post.ts`、`server/utils/trips.ts`、`app/components/admin/ContentBlockEditor.vue`

**現況**：schema 已經備好了 —— `content_snippets.mode`（`'copy' | 'reference'`，`schema.ts:156`）與 `content_blocks.snippetId`（`schema.ts:145`）欄位都在，註解也寫清楚了設計意圖。但 `from-snippet.post.ts` **完全沒讀 `mode`、也沒寫 `snippetId`**，一律走複製。前台也沒有解析引用的邏輯。

**要做的話**：
1. `from-snippet.post.ts`：讀 `snippet.mode`。`copy` 維持現狀；`reference` 時 `data` 存空字串（或存一份快照當 fallback），並寫入 `snippetId: snippet.id`。
2. `getTripBlocks`（`trips.ts:97`）：`snippetId` 有值時，改讀 `content_snippets.data`。注意這裡不能又變成 N+1 —— 一次把用到的 snippet 撈齊。
3. 後台區塊編輯器：引用模式的區塊要標示「引用自範本：XXX」且**不可就地編輯**（要改就去範本庫改），否則使用者會以為改得動、存了卻沒變。
4. 範本庫刪除時 `snippetId` 是 `ON DELETE SET NULL` —— 要處理「引用的範本被刪了」的顯示，不能直接空白。

**建議**：這一項沒有使用者回報的痛點，純粹是設計沒收尾。**先跳過，等 Phase C / D 做完再回頭問使用者要不要做。** 現在做的話，第 3、4 點的 UI 判斷會拖很久。

---

# Phase C — UI（7 項）

前台 3 項是使用者 2026-08-10 直接交辦的，優先於後台 4 項。

---

## TASK C1 ✅ — 首頁卡片跑版，固定大小＋文字 `...` 收尾

**檔案**：`app/components/TripCard.vue`（首頁「當前熱門」與 `/trips` 共用同一個元件）

**現象**：同一列的卡片高度不一致，看起來像跑版。

**根因**：`TripCard.vue` 的標題已經有 `line-clamp-2`、摘要有 `line-clamp-2`，但——
- `line-clamp-2` 只限制**上限**，標題只有一行時卡片就矮一截，同列高度不齊。
- `TripCard.vue:27` 的 badge 那一行是 `flex-wrap`，`primaryLabel` 太長時會換行，又多撐一行高度。
- 外層 `NuxtLink` 沒有 `h-full`，grid 的 `stretch` 拉不到內容。

**修法**：
1. 外層 `NuxtLink` 加 `flex h-full flex-col`，圖片區 `shrink-0`，`<div class="p-4">` 改成 `flex flex-1 flex-col`。
2. 標題那行從 `line-clamp-2` 改成同時鎖住高度：加 `min-h-[2.5rem]`（依實際 `text-sm` 行高調整，讓一行與兩行的標題佔一樣高）。摘要同理，`line-clamp-2` + `min-h-[2rem]`。
3. `TripCard.vue:27` 的 badge 行改成 `flex-nowrap` + `min-w-0`，`primaryLabel` 那個 `<span>` 加 `truncate`，badge 加 `shrink-0`。地名太長就 `...` 截斷，不要換行。
4. 底部那行「N 天 / 最近出團」加 `mt-auto`，讓它永遠貼在卡片底部，不管上面內容多長。

**注意**：不要用固定 `h-[380px]` 這種寫死高度 —— 手機直式與桌機四欄的合適高度不同，用 `h-full` + grid stretch 讓同列自動對齊才對。

**驗證**：首頁「當前熱門」與 `/trips` 兩處，故意找一個標題很短、一個很長的行程放同一列，卡片高度應一致，長文字以 `...` 收尾。手機寬度也要看一次。

---

## TASK C2 ✅ — 主題標籤篩選顯示英文 slug，要改成中文

**檔案**：`app/components/TripDetailView.vue:111`、`app/pages/trips/index.vue:16-21`

**現象**：從行程詳情頁點主題標籤跳到 `/trips`，下方「篩選條件」的 chip 顯示的是英文 slug（如 `sakura`）而不是中文（`賞櫻`）。

**根因**（已確認，兩處不一致）：
- `TripDetailView.vue:111` 送的是 **`tag.slug`** → `{ path: '/trips', query: { tag: tag.slug } }`
- `HeroExploreSection.vue:116` 送的是 **`item.name`** → `{ path: '/trips', query: { tag: item.name } }`
- `trips/index.vue:19` 的 `activeFilters` 是 `list.push(tag.value)` —— **直接把 query 字串當顯示文字**。所以從 hero 進來顯示中文、從詳情頁進來顯示英文。

`server/api/trips/index.get.ts:31-35` 的過濾兩者都吃（`tag.name === tagFilter || tag.slug === tagFilter`），所以篩選結果是對的，純粹是顯示問題。

**修法（兩邊都要動，不要只修顯示）**：
1. **統一 URL 帶 slug**。slug 是穩定識別碼，標籤改名時舊連結不會壞；中文 name 進網址還會被 URL-encode。把 `HeroExploreSection.vue:116` 從 `item.name` 改成 `item.slug`。
   - 檢查 `HeroExploreSection.vue` 的 `themeCards` computed（第 24 行起）有沒有帶出 `slug`，沒有的話補上。
   - 同時檢查 `app/pages/destinations/[slug].vue` 與 `app/pages/spots/[slug].vue` 有沒有類似的 `/trips?tag=` 連結，一併統一成 slug。
2. **顯示時把 slug 換回中文**。`trips/index.vue` 已經沒有 tag 清單，要補一個 `useFetch<TripTag[]>('/api/tags')`，然後：
   ```ts
   const { data: allTags } = await useFetch<TripTag[]>('/api/tags')
   const tagLabel = computed(() => {
     const raw = tag.value
     if (!raw) return ''
     // API 兩種都吃，所以 slug 與 name 都要能對應回中文
     return (allTags.value ?? []).find(t => t.slug === raw || t.name === raw)?.name ?? raw
   })
   ```
   `activeFilters` 改 push `tagLabel.value`。
3. **tag 也可能是地點或景點的 slug**（`index.get.ts:33-34` 明說了 tag 參數同時吃三種）。從目的地頁或景點頁進來時，`/api/tags` 查不到，會 fallback 顯示原始 slug —— 還是英文。所以要一併 fetch `/api/destinations` 與 `/api/spots`，三個清單依序找。找不到才 fallback 顯示原字串。

**驗證**：三個入口都試 ——（a）首頁 hero 主題卡（b）行程詳情頁的標籤（c）目的地頁的「看所有行程」。三者跳到 `/trips` 後 chip 都要顯示中文，且篩選結果正確。

---

## TASK C3 ✅ — 探索行程頁改成「用搜尋 bar 呈現」的邏輯

**檔案**：`app/pages/trips/index.vue`

這是使用者交辦的第 3 項，也是前台三項裡最大的一項。**分成兩個子任務，先做 C3a 確認可行再做 C3b。**

### C3a — 從 tag 切過來時，把 tag 帶進搜尋 bar

**目標**：製造「這批結果是你透過搜尋 bar 查到的」的錯覺，而不是「你被丟進一個帶篩選條件的頁面」。

**做法**：
1. 進頁面時（以及 `route.query.tag` 變動時），把 tag 對應的**中文名稱**（就是 C2 做出來的 `tagLabel`）填進搜尋輸入框的 `q`。
2. 既然 tag 已經呈現在搜尋 bar 裡，下方的 `activeFilters` chip 就**只保留 scope**（國內線／國外線），tag 那顆移除 —— 同一件事講兩次反而更亂。
3. 但**送給 API 的 query 還是要維持 `tag=` 參數**，不要改成 `q=`。理由：`tag` 是精確比對（`index.get.ts:31`），`q` 是模糊比對還會掃內文（`:38-52`），改用 `q` 會讓結果變多、變不準。所以是「輸入框顯示 tag 的中文，但底層仍用 tag 篩選」。
4. 使用者**手動改動輸入框內容並按搜尋**時，才切換成 `q=` 模式並清掉 `tag=`。實作上：記一個 `isTagDerived` 旗標，輸入框 `@input` 時設為 false；`submitSearch()` 裡若 `isTagDerived` 為 false 就 `router.replace({ query: { q } })`（丟掉 tag）。

### C3b — 輪播式 placeholder

**目標**：搜尋 bar 沒有輸入內容時，placeholder 文字會自己輪播（參考 Klook）。使用者看到「日本」時直接按搜尋，就以「日本」查詢。

**做法**：
1. 候選詞來源：**用真實資料，不要寫死字串**。取 `/api/destinations` 的國家 + 熱門城市名稱，再混入 `/api/tags` 的主題名稱，取前 6-8 個。資料還沒載入時 fallback 到現有的靜態 placeholder「搜尋地點、景點或行程類型」。
2. 輪播：`setInterval` 每 2.5 秒換下一個，`onBeforeUnmount` 要 `clearInterval`。**`import.meta.client` 才啟動**，SSR 階段不要跑，否則 hydration mismatch。
3. placeholder 文字組成 `搜尋「${current}」` 這種形式，讓使用者知道那是可以直接查的詞，而不是以為那是已經輸入的內容。
4. **關鍵行為**：`q` 為空時按搜尋 → 用**當下正在顯示的那個詞**去查。實作上維持一個 `currentPlaceholder` ref，`submitSearch()` 裡 `const keyword = q.value.trim() || currentPlaceholder.value`。
5. 使用者一開始打字（`q` 非空）就**停止輪播**，避免文字在他眼前跳動干擾。清空後再恢復。
6. 加淡入淡出過渡（`Transition` 或 CSS `opacity`），硬切會很跳。**不要**做打字機逐字效果，那個在 SSR + hydration 下很容易出事，成本也不成比例。

### C3c — 確認搜尋邏輯有吃到 tag

**已查證的結論，直接記著**：`server/api/trips/index.get.ts:44-46` 的 `q` 比對**只比對 name，沒有比對 slug**：

```ts
const relationMatch = t.tags.some(tag => tag.name.toLowerCase().includes(needle))
  || t.destinations.some(d => d.name.toLowerCase().includes(needle))
  || t.spots.some(s => s.name.toLowerCase().includes(needle))
```

而 `tag` 參數（`:31-35`）name 與 slug 都吃。所以：
- C3a 因為輸入框填的是**中文名稱**、底層仍走 `tag=`，不受影響。
- 但如果哪裡不小心把 slug 塞進 `q=`，會整個查不到。
- **修法**：在 `:44-46` 的三個 `some` 各補上 slug 比對（`|| tag.slug.toLowerCase().includes(needle)`）。低風險、順手做掉，讓 `q` 與 `tag` 的比對範圍一致。

**驗證**：
- 從首頁主題卡點「賞櫻」→ 搜尋框顯示「賞櫻」，結果正確，網址是 `?tag=sakura`。
- 清空搜尋框，等 placeholder 輪到「日本」，直接按搜尋 → 應查出日本的行程。
- 手動輸入「京都」按搜尋 → 網址變成 `?q=京都`，`tag` 消失。
- 檢查 console 沒有 hydration mismatch 警告。

---

## TASK C4 ✅ — 行程編輯頁要能直接新增國家與景點

**檔案**：`app/pages/admin/trips/[id]/index.vue`（「② 地點與景點」區塊，第 251-335 行）

**現況**：主題標籤有「＋新增標籤」的就地新增（`index.vue:328-333` 的 UI + `:99-111` 的 `createTag()`），但地點與景點沒有 —— 只能勾既有的，要新增得先跳到 `/admin/destinations`、`/admin/spots` 建好再回來，中途未儲存的編輯還會掉。

**修法**：比照 `createTag()` 的模式做兩個對應功能。API 都已經現成，不用改後端。

1. **新增景點**（簡單，先做）：
   - 在「造訪的景點」欄位下方加一排：名稱輸入框 + 所在地下拉（選填，選項用 `destinationTree`）+「＋新增景點」按鈕。
   - `POST /api/admin/spots`，body `{ name, destinationId }`。回傳的 spot 直接 push 進 `selectedSpotIds`。
   - 要 `refresh` 景點清單 —— 注意 `index.vue:15` 的 `allSpots` 目前**沒有解構出 refresh**，要改成 `const { data: allSpots, refresh: refreshSpots } = await useFetch(...)`。`allDestinations` 同理。

2. **新增地點**（較複雜）：
   - 「前往的地點」下方加一排：類型切換（國家／城市）+ 名稱輸入框 +（類型是城市時才出現的）所屬國家下拉 +「＋新增地點」按鈕。
   - `POST /api/admin/destinations`，body `{ name, type, parentId }`。
   - **後端的驗證要在前端先擋掉**，否則使用者只會看到紅字：城市必須選所屬國家（`destinations/index.post.ts` 會丟 400），所屬國家必須是 country 層級。
   - 新增國家時 `isDomestic` 預設 false。就地新增不提供這個開關 —— 這個欄位影響國內線／國外線的分類，值得使用者到 `/admin/destinations` 專門頁去想清楚再設。UI 上放一行小字說明：`國內／國外的設定請到「目的地」頁調整。`
   - 建好後自動勾選，且若目前還沒有主要地點就自動設為主要（比照 `toggleDestination` 的行為）。

3. 兩處都要處理錯誤顯示（API 會丟 400/409），不要靜默失敗。可以複用一個 `placeError` ref 顯示在該區塊下方。

**驗證**：在編輯頁直接新增一個城市（選好所屬國家）→ 立刻出現在清單且自動勾選 → 按儲存 → 重新整理後關聯還在。

---

## TASK C5 ✅ — `/admin/trips/new` 補上地點與景點欄位

**檔案**：`app/pages/admin/trips/new.vue`、`server/api/admin/trips/index.post.ts`

**現況**：新增頁只有標題／slug／簡介／天數／標籤（`new.vue:9-15`），建完還要再進編輯頁補一次地點景點。

**修法**：
1. 前端：把 C4 做好的地點／景點選取 UI 抽成共用元件（建議 `app/components/admin/PlacePicker.vue`），編輯頁與新增頁共用。**先做 C4 再做 C5** 就是為了這個——C4 做完才知道元件該長什麼樣。
2. 後端 `server/api/admin/trips/index.post.ts`：`CreateTripBody` 加 `destinationIds?: number[]` 與 `spotIds?: number[]`，寫入邏輯直接抄 `[id].patch.ts:54-74` 那段（含「陣列第一個是主要地點」的規則）。
3. 建議把 `[id].patch.ts` 那段關聯寫入抽成 `server/utils/places.ts` 的共用函式 —— 那個檔案已經存在，是對的位置。兩支 API 共用，避免規則漂移。

**驗證**：新增頁一次填完所有欄位建立行程，進到編輯頁時地點景點都已經帶好。

---

## TASK C6 ✅ — 建立 `/admin/trips` 獨立列表頁

**檔案**：新增 `app/pages/admin/trips/index.vue`，調整 `app/pages/admin/index.vue`、`app/layouts/admin.vue`

**現況**：行程列表在 `/admin` 儀表板上，跟統計卡片混在一起。`admin.vue:29` 的側邊欄「行程」指向 `/admin`，註解也承認了這是暫時狀態。TASK A4 也是這個缺口造成的。

**修法**：
1. 建 `app/pages/admin/trips/index.vue`，把 `/admin` 目前的行程列表區塊搬過去（含啟用開關、排序、狀態標籤那些既有功能，**行為完全照搬，不要順手改**）。
2. `/admin` 只留統計卡片 + 快捷入口，變成單純的儀表板。列表下方保留一顆「管理所有行程 →」導到 `/admin/trips`。
3. `app/layouts/admin.vue:29`：`{ label: '行程', to: '/admin/trips', match: p => p.startsWith('/admin/trips') }`，另外在「內容」上方或側邊欄頂部補一個「儀表板 → `/admin`」的入口，否則 `/admin` 會變成沒有導覽入口的孤兒頁。
4. **回頭修 TASK A4**：`app/pages/admin/trips/[id]/index.vue` 的 `removeTrip()` 把 `router.push('/admin')` 改回 `router.push('/admin/trips')`。
5. 檢查其他寫死 `/admin` 當「回行程列表」用的地方：`app/pages/admin/trips/[id]/index.vue:215`（麵包屑的「行程」）、`new.vue:53`（「返回後台」）。麵包屑該指 `/admin/trips`。

**驗證**：側邊欄「行程」→ 列表頁；刪除行程後正確回到列表頁不是 404；麵包屑點得回去。

---

# Phase D — SEO、效能與部署（5 項）

---

## TASK D1 ✅ — 確認 Tiptap 沒被打包進前台 bundle

**問題**：Lighthouse 報「Reduce unused JavaScript 可省 210 KiB」。Tiptap 有 20 個套件（見 `package.json` dependencies），只有後台的 `app/components/admin/TiptapEditor.vue` 用得到。

**做法**：
1. `npm run build` 後看 `.output/public/_nuxt/` 的 chunk 大小，或用 `npx nuxi analyze` 產生視覺化報告。
2. 確認前台入口 chunk（`/`、`/trips`、`/trips/[slug]`）有沒有引到 Tiptap。
3. **如果有**：檢查 `app/components/admin/*` 是不是被 Nuxt 自動 import 掃進了全域元件註冊。修法是在 `nuxt.config.ts` 把 admin 元件設成 lazy，或把 `TiptapEditor` 改成 `defineAsyncComponent` / `<LazyAdminTiptapEditor>`。
4. **如果沒有**：那 210 KiB 是別的東西（可能是 `@nuxt/ui` 的完整 icon set）。把實際結論寫進回報，不要硬修。

**注意**：這一項先量測再動手。看不到數據就改 config 只會亂。

---

## TASK D2 ✅ — 圖片換成 R2 真實照片（等客戶素材）

**現況**：Hero 與所有行程卡都在用 `picsum.photos` 的外部隨機圖（例如 `app/pages/trips/index.vue:66`）。

**這是首頁 Speed Index 15.8s 的主因**（唯一的紅燈；FCP 0.6s / LCP 1.4s / TBT 40ms / CLS 0 全都是綠的，只有視覺穩定時間拖到 16 秒）。同一個原因也對應 Lighthouse 的「Improve image delivery 385 KiB」。

**指示：現在不要為 Speed Index 做任何調校。** 換成 R2 真實照片後這個數字會自然消失，先調只是在對假資料做最佳化。

**現在可以做的**（低風險、換圖後仍然有用）：
1. Hero 圖加 `fetchpriority="high"`，行程卡的圖加 `loading="lazy"` + `decoding="async"`。
2. 所有 `<img>` 補上 `width` / `height` 屬性，避免之後換真圖時產生 CLS。
3. 確認 `@nuxt/image` 已經接上 R2 —— 上傳流程（`server/api/admin/media/index.post.ts` + Images binding 自動壓縮）已經做好了，前台顯示端有沒有走 `<NuxtImg>` 要確認。

---

## TASK D3 ✅ — 更新 `PLANNING_NOTES.md` 與 `SCHEMA_REDESIGN.md`

**現況**：
- `PLANNING_NOTES.md` 裡 destinations / spots / SEO 出現 **0 次**，與現況嚴重脫節（那三個實體已經上線好幾個 commit 了）。
- `SCHEMA_REDESIGN.md` 仍標示「待審閱」，但 schema 早就實作完成。

**做法**：
1. `SCHEMA_REDESIGN.md`：狀態從「待審閱」改成「已實作（commit `219b869`）」，把當初提案與最終實作有出入的地方註記出來。
2. `PLANNING_NOTES.md`：補上 destinations / spots / tags 三個實體拆分後的資料模型說明、SEO 的實作範圍（`usePageSeo`、JSON-LD、sitemap、robots）。
3. 兩份文件裡關於「部署要用客戶帳號」的警告要保留且更醒目。
4. 順手把這份 `IMPLEMENTATION_TASKS.md` 已完成的項目標記掉。

---

## TASK D4 — `/admin` 套上登入驗證（上線前必做）

**現況**：`/admin` 完全沒有任何驗證。目前只靠 `robots.txt` 與 `useSeoMeta({ robots: 'noindex' })` 擋搜尋引擎（`app/layouts/admin.vue:4`）—— **那只擋爬蟲，不擋人**。任何人知道網址就能改資料、刪行程。

**建議做法：Cloudflare Access**（Zero Trust）。
理由：不用寫任何驗證程式碼、不用管 session 與密碼雜湊、也不用在 D1 開 users 表。在 Cloudflare Dashboard 對 `wuqiong-travel.*/admin*` 加一條 Access Policy，指定允許的 email（客戶的 `nadia861130@gmail.com` + 開發者自己），Cloudflare 會在請求到 Worker 之前就擋掉。

**執行注意**：
1. **這一步要在客戶的 Cloudflare 帳號上操作**，不是開發者自己的帳號。
2. 保護範圍要包含 `/admin*` **與 `/api/admin/*`** —— 只擋 UI 不擋 API 等於沒擋。
3. 這是 Dashboard 操作不是程式碼改動，**要請使用者自己做或全程確認**。可以先幫他把步驟寫成清單。
4. 設定完務必實測：登出狀態開 `/admin` 應該被導去 Access 登入頁；直接 curl `POST /api/admin/trips` 應該回 403。

---

## TASK D5 — 部署前檢查清單（每次部署都跑一遍）

**⚠️ 這份清單裡的每一項都要人工確認，不要讓 agent 自動跑 `npm run deploy`。**

1. **`wrangler whoami` 確認登入的是客戶帳號** —— `nadia861130@gmail.com`，account id `d533ce3cc36dd35fbf18273d2db0d264`。不是開發者自己的帳號。這是整份文件最容易出事的一步：部署到錯的帳號會在開發者自己的 Cloudflare 上開出一個客戶的網站。
2. **migrations `0003` / `0004` / `0005` 從未套用到線上 D1** —— 線上仍是 `0002` 的舊 schema。`npm run deploy` 會依序跑 `build:cloudflare` → `db:verify` → `db:migrate` → `wrangler deploy`。第一次跑會一次補上三個 migration。
   - 套用前先確認 `scripts/verify-migrations.mjs` 過關。
   - `0003_destinations_spots_seo.sql` 是大改動（建 destinations / spots / trip_destinations / trip_spots，還搬了既有 tags 的資料）。**套用前先 `wrangler d1 export` 備份線上資料庫。**
3. `npm run build:cloudflare` 要能無錯完成。
4. Phase D4 的 Cloudflare Access 要已經生效。
5. 部署後實測：首頁 / 探索行程 / 一個行程詳情頁 / 目的地頁 / 景點頁 / `sitemap.xml` / `robots.txt` 各開一次。
6. 部署後再跑一次 Lighthouse，跟下方基準比對。

---

## 附錄：效能基準（2026-08-10 Lighthouse，供改動後比對）

**首頁 `/`（Mobile）** — Performance 85 / A11y 96 / Best Practices 100 / SEO 100
FCP 0.6s ✅ ・ LCP 1.4s ✅（門檻 <2.5s）・ TBT 40ms ✅ ・ CLS 0 ✅ ・ **Speed Index 15.8s ❌**

**`/admin`（Desktop）** — Performance 94 / LCP 0.8s / SEO 45
（SEO 45 是**預期值**：後台刻意 noindex 且原本無 title。TASK A3 補上 title 後這個分數仍會偏低，那是正確的，不要去追。）

**已知待處理**（依優先序）：
1. Speed Index 15.8s → 等 D2 換真實圖片，現在不調
2. TTFB 可省 1,070ms → **TASK B4**
3. Unused JS 210 KiB → **TASK D1**
4. bfcache 無法還原、Render-blocking 20ms → 影響很小，最後再說
5. 次要：console 有 `[Icon] failed to load icon lucide:*` 的 SSR 警告（圖示實際有顯示，可能造成首次繪製閃動）

---

## 附錄：本次程式碼審查新發現、尚未排進任務的問題

寫在這裡備查，**不要順手改**，要做請先問使用者：

- `server/api/admin/trips/[id]/batches.post.ts:28` **沒有寫入 `priceFrom`** —— 後台表單有這個欄位、填了也存不進去。已併入 **TASK B3** 處理。
- `server/api/admin/batches/[id].patch.ts` 的 `UpdateBody` 同樣要確認有沒有漏欄位。
- `app/pages/admin/trips/[id]/index.vue:158` 刪除後導向不存在的頁面 → **TASK A4**。
- `server/api/trips/index.get.ts:44-46` 的 `q` 搜尋只比對 name、不比對 slug，與 `tag` 參數的行為不一致 → **TASK C3c**。
