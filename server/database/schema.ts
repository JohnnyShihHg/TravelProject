import { sqliteTable, text, integer, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const trips = sqliteTable('trips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  // 行程產品本身的天數（例如「五日遊」），不是從 batch 的出發/回程日期算出來的
  days: integer('days').notNull(),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  // 標題旁的狀態標籤（熱銷中／即將成團／行程已結束…），null 代表不顯示
  badge: text('badge'),
  rank: integer('rank').notNull().default(0),
  // SEO 覆寫，兩者都是 nullable：留空時前台自動用 title / summary 產生 meta
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`)
})

// 地理實體（國家／城市），取代原本 tags 裡 category='location' 的標籤。
// 兩層就夠用：country -> city。「北海道」這種行政區在這個專案裡當 city 處理。
export const destinations = sqliteTable('destinations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', { enum: ['country', 'city'] }).notNull(),
  parentId: integer('parent_id').references((): AnySQLiteColumn => destinations.id, { onDelete: 'set null' }),
  // 國內線／國外線的唯一來源，取代 server/api/trips/index.get.ts 原本硬編碼的地名比對。
  // 只設在 country 上，city 從 parent 繼承。
  isDomestic: integer('is_domestic', { mode: 'boolean' }).notNull().default(false),
  description: text('description'),
  coverMediaId: integer('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
  rank: integer('rank').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
})

// 一個行程可能跨多個城市（大阪進、京都玩、東京出），所以是多對多。
// isPrimary 決定麵包屑要顯示哪一條路徑（首頁 › 日本 › 京都 › 行程）。
export const tripDestinations = sqliteTable('trip_destinations', {
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  destinationId: integer('destination_id').notNull().references(() => destinations.id, { onDelete: 'cascade' }),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false)
})

// 景點實體，取代原本 tags 裡 category='attraction' 的標籤。
// 重點是「清水寺」的介紹與照片只寫一次，所有行程共用；改一次全站更新。
export const spots = sqliteTable('spots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  destinationId: integer('destination_id').references(() => destinations.id, { onDelete: 'set null' }),
  description: text('description'),
  address: text('address'),
  // 座標存字串：只會原樣傳給地圖 API，不做數值運算，字串不會有浮點精度問題
  lat: text('lat'),
  lng: text('lng'),
  coverMediaId: integer('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
})

// 行程層級的景點關聯。刻意不做「每日層級」的景點關聯：每日行程是當次行程專屬的敘事
// （同樣走東京，東京→富士山 和 富士山→東京 內容完全不同），
// 而行程層級已足以支撐景點頁與「哪些行程會去富士山」的反向查詢。
export const tripSpots = sqliteTable('trip_spots', {
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  spotId: integer('spot_id').notNull().references(() => spots.id, { onDelete: 'cascade' })
})

// 主題標籤（賞櫻／親子／美食…）。原本的 category 欄位在地點與景點拆出去後
// 只會剩下唯一一個值，所以移除。
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull().unique()
})

export const tripTags = sqliteTable('trip_tags', {
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' })
})

export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  r2Key: text('r2_key').notNull(),
  // 應用程式自有路由 /media/{r2Key}，本機與正式環境相同（見 server/utils/media.ts）。
  // 刻意不存 R2 public URL，換網域或改走 CDN 都不需要動資料。
  url: text('url').notNull(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
  // 原本的 category 自由文字欄位已移除：它存的其實就是地名（東京／京都…），
  // 是 destinations 的字串複製品，會有錯字分身、且一張照片只能有一個值。
  // 改由下面兩張關聯表處理，見 migrations/0004。
})

// 照片與地點／景點的關聯。一張清水寺的照片可以同時掛「京都」與「清水寺」，
// 兩邊的 landing page 相簿都會自動出現它 —— 相簿不需要另外維護一份清單。
// 刻意不做 sortOrder：相簿只是提供地區瀏覽，依上傳時間倒序就夠。
export const mediaDestinations = sqliteTable('media_destinations', {
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  destinationId: integer('destination_id').notNull().references(() => destinations.id, { onDelete: 'cascade' })
})

export const mediaSpots = sqliteTable('media_spots', {
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  spotId: integer('spot_id').notNull().references(() => spots.id, { onDelete: 'cascade' })
})

export const tripImages = sqliteTable('trip_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  isCover: integer('is_cover', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0)
})

export const batches = sqliteTable('batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  departureDate: text('departure_date').notNull(), // ISO date
  returnDate: text('return_date').notNull(),
  flightInfo: text('flight_info'),
  meetingPoint: text('meeting_point'),
  // 給人看的自由文字，例如 "NT$ 42,900 起"，前台原樣顯示
  priceInfo: text('price_info'),
  // 給機器用的純數字，例如 42900。JSON-LD 的 Offer.price 必須是數字，
  // priceInfo 的字串無法使用；兩者刻意並存，各有用途。
  priceFrom: integer('price_from'),
  groupSize: integer('group_size'), // 成團人數（純顯示，本站無報名/庫存機制）
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
})

export const CONTENT_BLOCK_TYPES = ['richtext', 'highlights', 'flight', 'daily_itinerary'] as const
export type ContentBlockType = typeof CONTENT_BLOCK_TYPES[number]

export const contentBlocks = sqliteTable('content_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  type: text('type', { enum: CONTENT_BLOCK_TYPES }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  data: text('data').notNull(), // JSON, shape depends on type
  // 有值代表這個區塊是「引用」範本（snippet.mode='reference'）：渲染時讀範本的內容，
  // 範本改一次所有引用處一起更新。null 代表獨立內容（含插入時複製的那種）。
  snippetId: integer('snippet_id').references((): AnySQLiteColumn => contentSnippets.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
})

export const contentSnippets = sqliteTable('content_snippets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: CONTENT_BLOCK_TYPES }).notNull(),
  data: text('data').notNull(), // JSON, same shape as content_blocks.data for this type
  // copy = 插入時複製一份，之後各自獨立（適合每日行程骨架這種插入後要改寫的）
  // reference = 插入時只存關聯，改範本會影響所有引用處（適合退稅說明、行李限制這種制式條款）
  mode: text('mode', { enum: ['copy', 'reference'] }).notNull().default('copy'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
})

// 只服務首頁的標題／副標；圖片一律走 heroImages（其他三頁沒有可編輯的文案，所以只有圖片）
export const heroContent = sqliteTable('hero_content', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  // 首頁分享到 LINE／FB 時的 og:image。只有首頁需要手動指定 —— 其他頁面都自動用
  // 自己的照片（內容頁用封面、靜態頁用該頁第一張 hero）。沒設就退回第一張 hero 圖。
  ogMediaId: integer('og_media_id').references(() => media.id, { onDelete: 'set null' }),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`)
})

// 四個頁面的 hero 輪播圖共用一張表，用 page 區分（home / trips / about / contact）
export const heroImages = sqliteTable('hero_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page: text('page').notNull().default('home'),
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0)
})

export const contactSubmissions = sqliteTable('contact_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  interestedTripId: integer('interested_trip_id').references(() => trips.id, { onDelete: 'set null' }),
  message: text('message').notNull(),
  // 儀表板顯示的是「未讀」數量 —— 總數看久了就沒有意義，未讀才是待辦事項
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
})
