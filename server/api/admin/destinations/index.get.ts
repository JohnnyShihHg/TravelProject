import { eq, asc, sql } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { destinations, spots, tripDestinations, mediaDestinations, media } from '../../../database/schema'

// 後台清單比公開 API 多帶「被誰用到」的數量，刪除前才知道會影響什麼
export default defineEventHandler(async (event) => {
  const db = getDB(event)

  return db
    .select({
      id: destinations.id,
      slug: destinations.slug,
      name: destinations.name,
      type: destinations.type,
      parentId: destinations.parentId,
      isDomestic: destinations.isDomestic,
      description: destinations.description,
      coverMediaId: destinations.coverMediaId,
      coverImageUrl: media.url,
      rank: destinations.rank,
      tripCount: sql<number>`(SELECT COUNT(*) FROM ${tripDestinations} WHERE ${tripDestinations.destinationId} = ${destinations.id})`,
      spotCount: sql<number>`(SELECT COUNT(*) FROM ${spots} WHERE ${spots.destinationId} = ${destinations.id})`,
      photoCount: sql<number>`(SELECT COUNT(*) FROM ${mediaDestinations} WHERE ${mediaDestinations.destinationId} = ${destinations.id})`,
      childCount: sql<number>`(SELECT COUNT(*) FROM destinations child WHERE child.parent_id = ${destinations.id})`
    })
    .from(destinations)
    .leftJoin(media, eq(destinations.coverMediaId, media.id))
    .orderBy(asc(destinations.rank), asc(destinations.name))
    .all()
})
