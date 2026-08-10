import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { spots, tripSpots } from '../../../database/schema'

// 與目的地一樣：還被行程用到就擋下來，不做靜默的連鎖刪除
// （trip_spots 的外鍵是 CASCADE，直接刪會讓行程無聲無息少掉景點）。
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const db = getDB(event)
  const existing = await db.select().from(spots).where(eq(spots.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到這個景點' })

  const linkedTrips = await db.select({ tripId: tripSpots.tripId })
    .from(tripSpots).where(eq(tripSpots.spotId, id)).all()

  if (linkedTrips.length) {
    throw createError({
      statusCode: 409,
      statusMessage: `無法刪除「${existing.name}」：${linkedTrips.length} 個行程使用中。請先從那些行程移除這個景點。`
    })
  }

  // 只剩照片關聯時可以刪，media_spots 會 CASCADE 清掉（照片本身不會被刪）
  await db.delete(spots).where(eq(spots.id, id)).run()
  return { ok: true }
})
