import { eq, asc, sql, like, or } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { spots, destinations, tripSpots, mediaSpots, media } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  // 景點小卡選擇器用來打字過濾（景點數量已經到中大量規模，不能一次全撈給前端自己篩）
  const { q, limit } = getQuery(event)
  const query = typeof q === 'string' ? q.trim() : ''
  const max = Number(limit)

  return db
    .select({
      id: spots.id,
      slug: spots.slug,
      name: spots.name,
      destinationId: spots.destinationId,
      destinationName: destinations.name,
      description: spots.description,
      address: spots.address,
      lat: spots.lat,
      lng: spots.lng,
      coverMediaId: spots.coverMediaId,
      coverImageUrl: media.url,
      tripCount: sql<number>`(SELECT COUNT(*) FROM ${tripSpots} WHERE ${tripSpots.spotId} = ${spots.id})`,
      photoCount: sql<number>`(SELECT COUNT(*) FROM ${mediaSpots} WHERE ${mediaSpots.spotId} = ${spots.id})`
    })
    .from(spots)
    .leftJoin(destinations, eq(spots.destinationId, destinations.id))
    .leftJoin(media, eq(spots.coverMediaId, media.id))
    .where(query ? or(like(spots.name, `%${query}%`), like(spots.slug, `%${query}%`)) : undefined)
    .orderBy(asc(spots.name))
    .limit(Number.isInteger(max) && max > 0 ? max : -1)
    .all()
})
