import { eq } from 'drizzle-orm'
import type { DB } from './db'
import { mediaDestinations, mediaSpots, destinations, spots, media } from '../database/schema'

export interface MediaPlaceRef {
  id: number
  slug: string
  name: string
}

/**
 * 替一批照片帶上它們掛了哪些地點／景點。
 * 資料量小（媒體庫是幾十張的量級），一次撈完在記憶體組裝即可，
 * 不需要為此做 N+1 查詢或複雜的 SQL 聚合。
 */
export async function listMediaLinks<T extends { id: number }>(db: DB, rows: T[]) {
  if (rows.length === 0) return []

  const [destLinks, spotLinks] = await Promise.all([
    db.select({
      mediaId: mediaDestinations.mediaId,
      id: destinations.id,
      slug: destinations.slug,
      name: destinations.name
    }).from(mediaDestinations)
      .innerJoin(destinations, eq(mediaDestinations.destinationId, destinations.id))
      .all(),
    db.select({
      mediaId: mediaSpots.mediaId,
      id: spots.id,
      slug: spots.slug,
      name: spots.name
    }).from(mediaSpots)
      .innerJoin(spots, eq(mediaSpots.spotId, spots.id))
      .all()
  ])

  const byMedia = <R extends { mediaId: number }>(links: R[]) => {
    const map = new Map<number, Omit<R, 'mediaId'>[]>()
    for (const { mediaId, ...rest } of links) {
      const list = map.get(mediaId) ?? []
      list.push(rest)
      map.set(mediaId, list)
    }
    return map
  }

  const destMap = byMedia(destLinks)
  const spotMap = byMedia(spotLinks)

  return rows.map(row => ({
    ...row,
    destinations: (destMap.get(row.id) ?? []) as MediaPlaceRef[],
    spots: (spotMap.get(row.id) ?? []) as MediaPlaceRef[]
  }))
}

/** 覆寫一張照片的地點／景點關聯（先清空再寫入，避免重複列） */
export async function setMediaLinks(
  db: DB,
  mediaId: number,
  links: { destinationIds?: number[], spotIds?: number[] }
) {
  if (links.destinationIds) {
    await db.delete(mediaDestinations).where(eq(mediaDestinations.mediaId, mediaId)).run()
    for (const destinationId of [...new Set(links.destinationIds)]) {
      await db.insert(mediaDestinations).values({ mediaId, destinationId }).run()
    }
  }
  if (links.spotIds) {
    await db.delete(mediaSpots).where(eq(mediaSpots.mediaId, mediaId)).run()
    for (const spotId of [...new Set(links.spotIds)]) {
      await db.insert(mediaSpots).values({ mediaId, spotId }).run()
    }
  }
  const row = await db.select().from(media).where(eq(media.id, mediaId)).get()
  return row ? (await listMediaLinks(db, [row]))[0] : null
}
