import { eq, desc, asc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type { DB } from './db'
import { destinations, spots, media, mediaDestinations, mediaSpots, tripDestinations, tripSpots } from '../database/schema'
import { listPublishedTrips } from './trips'

// 資料量很小（一年約 20 團、地點不到十個），所以關聯過濾直接在 JS 做，
// 與 server/api/trips/index.get.ts 既有的做法一致，不為此寫複雜的 SQL。

const parent = alias(destinations, 'parent')

const destinationColumns = {
  id: destinations.id,
  slug: destinations.slug,
  name: destinations.name,
  type: destinations.type,
  parentId: destinations.parentId,
  isDomestic: destinations.isDomestic,
  description: destinations.description,
  coverImageUrl: media.url,
  rank: destinations.rank
}

const spotColumns = {
  id: spots.id,
  slug: spots.slug,
  name: spots.name,
  destinationId: spots.destinationId,
  description: spots.description,
  address: spots.address,
  lat: spots.lat,
  lng: spots.lng,
  coverImageUrl: media.url
}

/**
 * 掛在這些地點上的照片。國家頁會連同底下城市的照片一起帶出來
 * （與行程、景點區塊的聚合行為一致），同一張照片同時掛了城市與國家時只出現一次。
 * 刻意不做排序欄位：相簿只是提供地區瀏覽，依上傳時間倒序就夠。
 */
async function getDestinationPhotos(db: DB, destinationIds: number[]) {
  if (destinationIds.length === 0) return []
  const rows = await db
    .select({ id: media.id, url: media.url, createdAt: media.createdAt })
    .from(mediaDestinations)
    .innerJoin(media, eq(mediaDestinations.mediaId, media.id))
    .where(inArray(mediaDestinations.destinationId, destinationIds))
    .orderBy(desc(media.createdAt))
    .all()
  return dedupeById(rows)
}

async function getSpotPhotos(db: DB, spotId: number) {
  const rows = await db
    .select({ id: media.id, url: media.url, createdAt: media.createdAt })
    .from(mediaSpots)
    .innerJoin(media, eq(mediaSpots.mediaId, media.id))
    .where(eq(mediaSpots.spotId, spotId))
    .orderBy(desc(media.createdAt))
    .all()
  return dedupeById(rows)
}

function dedupeById<T extends { id: number }>(rows: T[]) {
  const seen = new Set<number>()
  return rows.filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)))
}

export async function listDestinations(db: DB) {
  return db
    .select(destinationColumns)
    .from(destinations)
    .leftJoin(media, eq(destinations.coverMediaId, media.id))
    .orderBy(asc(destinations.rank), asc(destinations.name))
    .all()
}

export async function listSpots(db: DB) {
  return db
    .select(spotColumns)
    .from(spots)
    .leftJoin(media, eq(spots.coverMediaId, media.id))
    .orderBy(asc(spots.name))
    .all()
}

export async function getDestinationDetail(db: DB, slug: string) {
  const row = await db
    .select({ ...destinationColumns, parentSlug: parent.slug, parentName: parent.name })
    .from(destinations)
    .leftJoin(parent, eq(destinations.parentId, parent.id))
    .leftJoin(media, eq(destinations.coverMediaId, media.id))
    .where(eq(destinations.slug, slug))
    .get()
  if (!row) return null

  const { parentSlug, parentName, ...destination } = row

  const [allDestinations, allSpots, publishedTrips] = await Promise.all([
    listDestinations(db),
    listSpots(db),
    listPublishedTrips(db)
  ])

  // 國家頁要一併涵蓋底下城市的行程與景點：只掛「京都」沒掛「日本」的行程
  // 也應該出現在 /destinations/japan
  const children = allDestinations.filter(d => d.parentId === destination.id)
  const scopeIds = new Set([destination.id, ...children.map(c => c.id)])
  const photos = await getDestinationPhotos(db, [...scopeIds])

  return {
    ...destination,
    parent: destination.parentId && parentSlug && parentName
      ? { id: destination.parentId, slug: parentSlug, name: parentName }
      : null,
    children,
    spots: allSpots.filter(s => s.destinationId !== null && scopeIds.has(s.destinationId)),
    trips: publishedTrips.filter(t => t.destinations.some(d => scopeIds.has(d.id))),
    photos
  }
}

/**
 * 覆寫一個行程的地點／景點關聯，新增與編輯共用（陣列第一個地點是主要地點，
 * 決定前台麵包屑路徑）。呼叫端只在對應的欄位有傳值時才呼叫，全覆寫、不做差異比對。
 */
export async function setTripDestinations(db: DB, tripId: number, destinationIds: number[]) {
  await db.delete(tripDestinations).where(eq(tripDestinations.tripId, tripId)).run()
  for (const [index, destinationId] of [...new Set(destinationIds)].entries()) {
    const found = await db.select({ id: destinations.id }).from(destinations)
      .where(eq(destinations.id, destinationId)).get()
    if (found) {
      await db.insert(tripDestinations).values({
        tripId, destinationId: found.id, isPrimary: index === 0
      }).run()
    }
  }
}

export async function setTripSpots(db: DB, tripId: number, spotIds: number[]) {
  await db.delete(tripSpots).where(eq(tripSpots.tripId, tripId)).run()
  for (const spotId of [...new Set(spotIds)]) {
    const found = await db.select({ id: spots.id }).from(spots).where(eq(spots.id, spotId)).get()
    if (found) await db.insert(tripSpots).values({ tripId, spotId: found.id }).run()
  }
}

export async function getSpotDetail(db: DB, slug: string) {
  const row = await db
    .select(spotColumns)
    .from(spots)
    .leftJoin(media, eq(spots.coverMediaId, media.id))
    .where(eq(spots.slug, slug))
    .get()
  if (!row) return null

  const [allDestinations, publishedTrips] = await Promise.all([
    listDestinations(db),
    listPublishedTrips(db)
  ])

  const destination = allDestinations.find(d => d.id === row.destinationId) ?? null
  const destinationParent = destination?.parentId
    ? allDestinations.find(d => d.id === destination.parentId) ?? null
    : null
  const photos = await getSpotPhotos(db, row.id)

  return {
    ...row,
    destination,
    // 麵包屑要 首頁 › 日本 › 京都 › 清水寺，所以連景點所屬城市的國家也要帶出來
    destinationParent,
    trips: publishedTrips.filter(t => t.spots.some(s => s.id === row.id)),
    photos
  }
}
