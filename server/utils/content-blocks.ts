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

export function defaultBlockData(type: ContentBlockType): BlockData {
  switch (type) {
    case 'richtext':
    case 'highlights':
      return { html: '' }
    case 'flight':
      return { legs: [] }
    case 'daily_itinerary':
      return { days: [] }
  }
}

export function parseBlockData(raw: string): BlockData {
  return JSON.parse(raw)
}
