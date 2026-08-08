import { eq, asc } from 'drizzle-orm'
import { db } from './db'
import { trips, batches, tags, tripTags, media, tripImages, contentBlocks } from '../database/schema'
import { parseBlockData } from './content-blocks'

export function getTripTags(tripId: number) {
  return db
    .select({ id: tags.id, name: tags.name, category: tags.category })
    .from(tripTags)
    .innerJoin(tags, eq(tripTags.tagId, tags.id))
    .where(eq(tripTags.tripId, tripId))
    .all()
}

export function getTripBatches(tripId: number) {
  return db
    .select()
    .from(batches)
    .where(eq(batches.tripId, tripId))
    .orderBy(asc(batches.departureDate))
    .all()
}

export function getTripImages(tripId: number) {
  return db
    .select({
      id: tripImages.id,
      mediaId: tripImages.mediaId,
      isCover: tripImages.isCover,
      sortOrder: tripImages.sortOrder,
      url: media.url,
      category: media.category
    })
    .from(tripImages)
    .innerJoin(media, eq(tripImages.mediaId, media.id))
    .where(eq(tripImages.tripId, tripId))
    .orderBy(asc(tripImages.sortOrder))
    .all()
}

export function getTripBlocks(tripId: number) {
  return db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.tripId, tripId))
    .orderBy(asc(contentBlocks.sortOrder))
    .all()
    .map(row => ({ ...row, data: parseBlockData(row.data) }))
}

export function enrichTrip(trip: typeof trips.$inferSelect) {
  const tripTagList = getTripTags(trip.id)
  const tripBatches = getTripBatches(trip.id)
  const images = getTripImages(trip.id)
  const cover = images.find(i => i.isCover) ?? images[0] ?? null
  const today = new Date().toISOString().slice(0, 10)
  const nextBatch = tripBatches.find(b => b.departureDate >= today) ?? null

  return {
    ...trip,
    tags: tripTagList,
    batches: tripBatches,
    images,
    coverImageUrl: cover?.url ?? null,
    nextBatch
  }
}

export function enrichTripDetail(trip: typeof trips.$inferSelect) {
  return {
    ...enrichTrip(trip),
    blocks: getTripBlocks(trip.id)
  }
}

export function listPublishedTrips() {
  const rows = db.select().from(trips).where(eq(trips.status, 'published')).all()
  return rows.map(enrichTrip)
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ')
}

export function getTripSearchText(tripId: number) {
  const blocks = getTripBlocks(tripId)
  return blocks.map((block) => {
    if (block.type === 'richtext' || block.type === 'highlights') {
      return stripHtml((block.data as { html: string }).html)
    }
    if (block.type === 'daily_itinerary') {
      const data = block.data as { days: { title: string, html: string }[] }
      return data.days.map(d => `${d.title} ${stripHtml(d.html)}`).join(' ')
    }
    return ''
  }).join(' ')
}
