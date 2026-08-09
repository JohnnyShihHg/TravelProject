// 首頁 Hero 底部四個入口，選了之後在下方展開對應區塊
export type HeroChoice = 'domestic' | 'overseas' | 'flight' | 'theme'

// 行程標題旁可選的狀態標籤
export const TRIP_BADGES = ['熱銷中', '即將成團', '已成團', '最後席次', '行程已結束'] as const

export interface TripTag {
  id: number
  name: string
  category: 'location' | 'attraction' | 'type'
}

export interface TripBatch {
  id: number
  tripId: number
  departureDate: string
  returnDate: string
  flightInfo: string | null
  meetingPoint: string | null
  priceInfo: string | null
  groupSize: number | null
}

export interface TripImage {
  id: number
  mediaId: number
  isCover: boolean
  sortOrder: number
  url: string
  category: string | null
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
  createdAt: string
  updatedAt: string
  tags: TripTag[]
  batches: TripBatch[]
  images: TripImage[]
  coverImageUrl: string | null
  nextBatch: TripBatch | null
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
}

export interface ContentSnippet {
  id: number
  name: string
  type: ContentBlockType
  data: BlockData
}

export interface TripDetail extends TripSummary {
  blocks: ContentBlock[]
}

export interface CalendarBatch {
  batchId: number
  departureDate: string
  returnDate: string
  priceInfo: string | null
  groupSize: number | null
  tripId: number
  tripSlug: string
  tripTitle: string
}

export interface HeroContent {
  id: number
  title: string
  subtitle: string
  imageUrl: string
}
