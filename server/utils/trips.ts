import { eq, asc } from 'drizzle-orm'
import type { DB } from './db'
import { trips, batches, tags, tripTags, media, tripImages, contentBlocks } from '../database/schema'
import { parseBlockData } from './content-blocks'

export async function getTripTags(db: DB, tripId: number) {
  return db
    .select({ id: tags.id, name: tags.name, category: tags.category })
    .from(tripTags)
    .innerJoin(tags, eq(tripTags.tagId, tags.id))
    .where(eq(tripTags.tripId, tripId))
    .all()
}

export async function getTripBatches(db: DB, tripId: number) {
  return db
    .select()
    .from(batches)
    .where(eq(batches.tripId, tripId))
    .orderBy(asc(batches.departureDate))
    .all()
}

export async function getTripImages(db: DB, tripId: number) {
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

export async function getTripBlocks(db: DB, tripId: number) {
  const rows = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.tripId, tripId))
    .orderBy(asc(contentBlocks.sortOrder))
    .all()
  return rows.map(row => ({ ...row, data: parseBlockData(row.data) }))
}

export async function enrichTrip(db: DB, trip: typeof trips.$inferSelect) {
  const [tripTagList, tripBatches, images] = await Promise.all([
    getTripTags(db, trip.id),
    getTripBatches(db, trip.id),
    getTripImages(db, trip.id)
  ])
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

export async function enrichTripDetail(db: DB, trip: typeof trips.$inferSelect) {
  const [summary, blocks] = await Promise.all([
    enrichTrip(db, trip),
    getTripBlocks(db, trip.id)
  ])
  return { ...summary, blocks }
}

export async function listPublishedTrips(db: DB) {
  const rows = await db.select().from(trips).where(eq(trips.status, 'published')).all()
  return Promise.all(rows.map(trip => enrichTrip(db, trip)))
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ')
}

export async function getTripSearchText(db: DB, tripId: number) {
  const blocks = await getTripBlocks(db, tripId)
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
