import { eq, asc } from 'drizzle-orm'
import { db } from './db'
import { trips, batches, tags, tripTags, media, tripImages } from '../database/schema'

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

export function listPublishedTrips() {
  const rows = db.select().from(trips).where(eq(trips.status, 'published')).all()
  return rows.map(enrichTrip)
}
