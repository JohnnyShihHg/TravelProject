// 首頁 Hero 底部四個入口，選了之後在下方展開對應區塊
export type HeroChoice = 'domestic' | 'overseas' | 'flight' | 'theme'

// 行程標題旁可選的狀態標籤
export const TRIP_BADGES = ['熱銷中', '即將成團', '已成團', '最後席次', '行程已結束'] as const

/** 主題標籤（賞櫻／親子／美食…）。地點與景點各自有獨立的型別。 */
export interface TripTag {
  id: number
  slug: string
  name: string
}

/** 地理實體。country 為頂層，city 的 parentId 指向所屬國家。 */
export interface Destination {
  id: number
  slug: string
  name: string
  type: 'country' | 'city'
  parentId: number | null
  /** 國內線／國外線的唯一來源，只設在 country 上 */
  isDomestic: boolean
  description: string | null
  coverImageUrl: string | null
  rank: number
}

/** 行程掛上的地點，isPrimary 那一筆決定麵包屑路徑 */
export interface TripDestination extends Destination {
  isPrimary: boolean
  /** 所屬國家，city 才有；country 自己為 null */
  parent: { id: number, slug: string, name: string } | null
}

/** 景點實體，介紹與照片跨行程共用 */
export interface Spot {
  id: number
  slug: string
  name: string
  destinationId: number | null
  description: string | null
  address: string | null
  lat: string | null
  lng: string | null
  coverImageUrl: string | null
}

/** 後台目的地清單，比公開版多帶「被誰用到」的數量，刪除前才知道會影響什麼 */
export interface AdminDestination extends Destination {
  coverMediaId: number | null
  tripCount: number
  spotCount: number
  photoCount: number
  childCount: number
}

/** 後台景點清單 */
export interface AdminSpot extends Spot {
  destinationName: string | null
  coverMediaId: number | null
  tripCount: number
  photoCount: number
}

/** 相簿裡的一張照片 */
export interface GalleryPhoto {
  id: number
  url: string
  createdAt: string
}

/** /destinations/[slug] 頁面用 */
export interface DestinationDetail extends Destination {
  parent: { id: number, slug: string, name: string } | null
  /** 底下的城市（只有 country 會有） */
  children: Destination[]
  spots: Spot[]
  trips: TripSummary[]
  /** 掛在這個地點（國家含底下城市）的照片 */
  photos: GalleryPhoto[]
}

/** /spots/[slug] 頁面用 */
export interface SpotDetail extends Spot {
  destination: Destination | null
  /** 景點所屬城市的國家，麵包屑需要 */
  destinationParent: Destination | null
  trips: TripSummary[]
  photos: GalleryPhoto[]
}

/** 麵包屑的一段，最後一段通常不給 to（代表目前頁面） */
export interface Crumb {
  label: string
  to?: string
}

export interface TripBatch {
  id: number
  tripId: number
  departureDate: string
  returnDate: string
  flightInfo: string | null
  meetingPoint: string | null
  /** 給人看的自由文字，例如 "NT$ 42,900 起" */
  priceInfo: string | null
  /** 給機器用的純數字，供 JSON-LD 的 Offer.price 與價格排序使用 */
  priceFrom: number | null
  groupSize: number | null
}

export interface TripImage {
  id: number
  mediaId: number
  isCover: boolean
  sortOrder: number
  url: string
}

/** 照片掛到的地點／景點 */
export interface MediaPlaceRef {
  id: number
  slug: string
  name: string
}

/** 後台媒體庫的一張照片，帶上它掛了哪些地點與景點 */
export interface MediaLibraryItem {
  id: number
  r2Key: string
  url: string
  createdAt: string
  destinations: MediaPlaceRef[]
  spots: MediaPlaceRef[]
}

export interface TripSummary {
  id: number
  slug: string
  title: string
  summary: string
  days: number
  status: 'draft' | 'published'
  isFeatured: boolean
  /** 標題旁的狀態標籤，null 代表不顯示 */
  badge: string | null
  rank: number
  /** SEO 覆寫，null 代表前台自動用 title 產生 */
  seoTitle: string | null
  /** SEO 覆寫，null 代表前台自動用 summary 產生 */
  seoDescription: string | null
  createdAt: string
  updatedAt: string
  tags: TripTag[]
  destinations: TripDestination[]
  spots: Spot[]
  batches: TripBatch[]
  images: TripImage[]
  coverImageUrl: string | null
  nextBatch: TripBatch | null
  /** destinations 裡 isPrimary 的那一筆，麵包屑用 */
  primaryDestination: TripDestination | null
}

export type ContentBlockType = 'richtext' | 'highlights' | 'flight' | 'daily_itinerary'

export interface RichTextBlockData {
  html: string
}

export interface FlightLeg {
  label: string
  date: string
  airline: string
  fromCode: string
  fromName: string
  toCode: string
  toName: string
  departTime: string
  arriveTime: string
  duration: string
}

export interface FlightBlockData {
  legs: FlightLeg[]
}

export interface DailyItineraryDay {
  day: number
  title: string
  html: string
  meals: { breakfast: string, lunch: string, dinner: string }
  hotel: string
}

export interface DailyItineraryBlockData {
  days: DailyItineraryDay[]
}

export type BlockData = RichTextBlockData | FlightBlockData | DailyItineraryBlockData

export interface ContentBlock {
  id: number
  tripId: number
  type: ContentBlockType
  sortOrder: number
  data: BlockData
  /** 有值代表內容來自範本（snippet.mode='reference'）。編輯這個區塊等於編輯範本本身，
   *  改一次所有引用這個範本的行程會一起更新，不能只改這個行程自己的版本。 */
  snippetId: number | null
}

export interface ContentSnippet {
  id: number
  name: string
  type: ContentBlockType
  data: BlockData
  /** copy = 插入時複製後各自獨立；reference = 改範本會影響所有引用處 */
  mode: 'copy' | 'reference'
}

export interface TripDetail extends TripSummary {
  blocks: ContentBlock[]
}

export interface CalendarBatch {
  batchId: number
  departureDate: string
  returnDate: string
  priceInfo: string | null
  priceFrom: number | null
  groupSize: number | null
  tripId: number
  tripSlug: string
  tripTitle: string
}

export interface HeroImage {
  id: number
  url: string
}

/** /api/hero?page= 的回傳。title/subtitle 只有首頁有，其他三頁只管圖片 */
export interface HeroContent {
  page: string
  title: string | null
  subtitle: string | null
  images: HeroImage[]
}
