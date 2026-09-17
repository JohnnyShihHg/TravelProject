import type { ContentBlockType } from '../database/schema'

export interface RichTextBlockData {
  html: string
}

export interface FlightLeg {
  label: string // 去程 / 回程
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
  kind: 'day'
  day: number
  title: string
  html: string
  meals: { breakfast: string, lunch: string, dinner: string }
  hotel: string
}

/** 插在天數之間的景點小卡，spot 欄位只在回應時由 enrichDailyItineraryBlocks() 補上 */
export interface SpotCardItem {
  kind: 'spotCard'
  id: string
  spotId: number
  caption?: string
  imageMediaId?: number
  spot?: { slug: string, name: string, description: string | null, coverImageUrl: string | null }
  imageUrl?: string
}

export type DailyItineraryItem = DailyItineraryDay | SpotCardItem

export interface DailyItineraryBlockData {
  items: DailyItineraryItem[]
}

export type BlockData = RichTextBlockData | FlightBlockData | DailyItineraryBlockData

export function defaultBlockData(type: ContentBlockType): BlockData {
  switch (type) {
    case 'richtext':
    case 'highlights':
      return { html: '' }
    case 'flight':
      return { legs: [] }
    case 'daily_itinerary':
      return { items: [] }
  }
}

/**
 * 舊資料只有 `{ days: [...] }`（沒有 kind 判別欄位、沒有 items）。
 * 就地正規化成新的 items 形狀，不用跑 migration 去改 D1 裡的資料——
 * 之後所有後台儲存一律寫 items，舊格式只會出現在還沒被編輯過的舊行程。
 */
function normalizeDailyItineraryData(data: { items?: unknown[], days?: unknown[] }): DailyItineraryBlockData {
  if (Array.isArray(data.items)) return { items: data.items as DailyItineraryItem[] }
  if (Array.isArray(data.days)) {
    return { items: data.days.map(d => ({ kind: 'day' as const, ...(d as Omit<DailyItineraryDay, 'kind'>) })) }
  }
  return { items: [] }
}

export function parseBlockData(raw: string): BlockData {
  const data = JSON.parse(raw)
  if (Array.isArray(data.days) || Array.isArray(data.items)) return normalizeDailyItineraryData(data)
  return data
}
