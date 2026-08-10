import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { media, tripImages, destinations, spots, trips } from '../../../database/schema'
import { deleteStoredImage } from '../../../utils/media'

// media 被三個地方指到，而且外鍵行為都是「安靜地改掉」：
//   trip_images → CASCADE（行程的照片會直接消失）
//   destinations.cover_media_id / spots.cover_media_id → SET NULL（封面變空白）
// 所以還在使用中就擋下來，說明是哪些內容在用它。
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const db = getDB(event)
  const existing = await db.select().from(media).where(eq(media.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到這張照片' })

  const [usedByTrips, coverOfDestinations, coverOfSpots] = await Promise.all([
    db.select({ title: trips.title })
      .from(tripImages)
      .innerJoin(trips, eq(tripImages.tripId, trips.id))
      .where(eq(tripImages.mediaId, id)).all(),
    db.select({ name: destinations.name }).from(destinations).where(eq(destinations.coverMediaId, id)).all(),
    db.select({ name: spots.name }).from(spots).where(eq(spots.coverMediaId, id)).all()
  ])

  const blockers: string[] = []
  if (usedByTrips.length) blockers.push(`${usedByTrips.length} 個行程的照片`)
  if (coverOfDestinations.length) blockers.push(`${coverOfDestinations.map(d => d.name).join('、')} 的封面`)
  if (coverOfSpots.length) blockers.push(`${coverOfSpots.map(s => s.name).join('、')} 的封面`)

  if (blockers.length) {
    throw createError({
      statusCode: 409,
      statusMessage: `無法刪除：這張照片正被用於${blockers.join('、')}。請先解除這些使用。`
    })
  }

  // 先刪資料庫紀錄（真正的來源），再盡力刪掉檔案；
  // media_destinations / media_spots 的關聯會 CASCADE 一起清掉，那只是標記不是內容。
  await db.delete(media).where(eq(media.id, id)).run()
  await deleteStoredImage(event, existing.r2Key)

  return { ok: true }
})
