import { desc, eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { media, mediaDestinations, mediaSpots, destinations, spots } from '../../../database/schema'
import { listMediaLinks } from '../../../utils/media-links'

// ?destination=kyoto / ?spot=kiyomizu-dera 依關聯篩選（取代原本的自由文字 category）
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const destinationSlug = typeof query.destination === 'string' ? query.destination : ''
  const spotSlug = typeof query.spot === 'string' ? query.spot : ''

  const db = getDB(event)

  if (destinationSlug) {
    return db
      .select({ id: media.id, r2Key: media.r2Key, url: media.url, createdAt: media.createdAt })
      .from(mediaDestinations)
      .innerJoin(media, eq(mediaDestinations.mediaId, media.id))
      .innerJoin(destinations, eq(mediaDestinations.destinationId, destinations.id))
      .where(eq(destinations.slug, destinationSlug))
      .orderBy(desc(media.createdAt))
      .all()
  }

  if (spotSlug) {
    return db
      .select({ id: media.id, r2Key: media.r2Key, url: media.url, createdAt: media.createdAt })
      .from(mediaSpots)
      .innerJoin(media, eq(mediaSpots.mediaId, media.id))
      .innerJoin(spots, eq(mediaSpots.spotId, spots.id))
      .where(eq(spots.slug, spotSlug))
      .orderBy(desc(media.createdAt))
      .all()
  }

  // 後台媒體庫：整份清單並帶上每張照片掛了哪些地點／景點，方便挑圖時辨識
  const rows = await db.select().from(media).orderBy(desc(media.createdAt)).all()
  return listMediaLinks(db, rows)
})
