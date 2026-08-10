import { eq, asc } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type { DB } from './db'
import { trips, batches, tags, tripTags, destinations, tripDestinations, spots, tripSpots, media, tripImages, contentBlocks } from '../database/schema'
import { parseBlockData } from './content-blocks'

export async function getTripTags(db: DB, tripId: number) {
  return db
    .select({ id: tags.id, slug: tags.slug, name: tags.name })
    .from(tripTags)
    .innerJoin(tags, eq(tripTags.tagId, tags.id))
    .where(eq(tripTags.tripId, tripId))
    .all()
}

export async function getTripDestinations(db: DB, tripId: number) {
  // 城市要一併帶出所屬國家，麵包屑（首頁 › 日本 › 京都 › 行程）才有得組
  const parent = alias(destinations, 'parent')
  const rows = await db
    .select({
      id: destinations.id,
      slug: destinations.slug,
      name: destinations.name,
      type: destinations.type,
      parentId: destinations.parentId,
      isDomestic: destinations.isDomestic,
      description: destinations.description,
      coverImageUrl: media.url,
      rank: destinations.rank,
      isPrimary: tripDestinations.isPrimary,
      parentSlug: parent.slug,
      parentName: parent.name,
      parentIsDomestic: parent.isDomestic
    })
    .from(tripDestinations)
    .innerJoin(destinations, eq(tripDestinations.destinationId, destinations.id))
    .leftJoin(parent, eq(destinations.parentId, parent.id))
    .leftJoin(media, eq(destinations.coverMediaId, media.id))
    .where(eq(tripDestinations.tripId, tripId))
    .orderBy(asc(destinations.rank))
    .all()

  return rows.map(({ parentSlug, parentName, parentIsDomestic, ...d }) => ({
    ...d,
    parent: d.parentId && parentSlug && parentName
      ? { id: d.parentId, slug: parentSlug, name: parentName, isDomestic: parentIsDomestic ?? false }
      : null
  }))
}

export async function getTripSpots(db: DB, tripId: number) {
  return db
    .select({
      id: spots.id,
      slug: spots.slug,
      name: spots.name,
      destinationId: spots.destinationId,
      description: spots.description,
      address: spots.address,
      lat: spots.lat,
      lng: spots.lng,
      coverImageUrl: media.url
    })
    .from(tripSpots)
    .innerJoin(spots, eq(tripSpots.spotId, spots.id))
    .leftJoin(media, eq(spots.coverMediaId, media.id))
    .where(eq(tripSpots.tripId, tripId))
    .orderBy(asc(spots.name))
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
      url: media.url
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
  const [tripTagList, tripDestinationList, tripSpotList, tripBatches, images] = await Promise.all([
    getTripTags(db, trip.id),
    getTripDestinations(db, trip.id),
    getTripSpots(db, trip.id),
    getTripBatches(db, trip.id),
    getTripImages(db, trip.id)
  ])
  const cover = images.find(i => i.isCover) ?? images[0] ?? null
  const today = new Date().toISOString().slice(0, 10)
  const nextBatch = tripBatches.find(b => b.departureDate >= today) ?? null

  return {
    ...trip,
    tags: tripTagList,
    destinations: tripDestinationList,
    spots: tripSpotList,
    batches: tripBatches,
    images,
    coverImageUrl: cover?.url ?? null,
    nextBatch,
    primaryDestination: tripDestinationList.find(d => d.isPrimary) ?? tripDestinationList[0] ?? null
  }
}

/**
 * 行程是不是國內線。isDomestic 只設在國家上，所以城市要看它的 parent
 * —— 只掛「京都」沒掛「日本」的行程也要能正確判斷。
 * 取代了原本 server/api/trips/index.get.ts 裡靠地名字串硬編碼的 DOMESTIC_LOCATIONS。
 *
 * 回傳 null 代表這個行程還沒掛任何地點，無法判斷（呼叫端自行決定要不要顯示）。
 */
export function isDomesticTrip(
  trip: { destinations: { type: string, isDomestic: boolean, parent: { isDomestic: boolean } | null }[] }
): boolean | null {
  if (trip.destinations.length === 0) return null
  return trip.destinations.some(d => (d.type === 'country' ? d.isDomestic : d.parent?.isDomestic ?? false))
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
