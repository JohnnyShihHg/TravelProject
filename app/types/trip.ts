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
  rank: number
  tags: TripTag[]
  batches: TripBatch[]
  images: TripImage[]
  coverImageUrl: string | null
  nextBatch: TripBatch | null
}

export interface TripDetail extends TripSummary {
  content: string
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
