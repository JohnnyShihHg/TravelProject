import { eq, asc, sql } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { spots, destinations, tripSpots, mediaSpots, media } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const db = getDB(event)

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
    .orderBy(asc(spots.name))
    .all()
})
