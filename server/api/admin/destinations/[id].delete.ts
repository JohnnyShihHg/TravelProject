import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { destinations, spots, tripDestinations } from '../../../database/schema'

// 刪除會連帶影響很多東西，而且外鍵是 CASCADE / SET NULL，出手就收不回來：
//   trip_destinations → CASCADE（行程會失去地點，可能連麵包屑的主要地點都沒了）
//   spots.destination_id → SET NULL（景點變成沒有所在地）
//   子城市的 parent_id → SET NULL（城市變成孤兒）
// 所以還被使用中就直接擋下並說明卡在哪裡，不做靜默的連鎖刪除。
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const db = getDB(event)
  const existing = await db.select().from(destinations).where(eq(destinations.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到這個目的地' })

  const [children, linkedSpots, linkedTrips] = await Promise.all([
    db.select({ id: destinations.id }).from(destinations).where(eq(destinations.parentId, id)).all(),
    db.select({ id: spots.id }).from(spots).where(eq(spots.destinationId, id)).all(),
    db.select({ tripId: tripDestinations.tripId }).from(tripDestinations).where(eq(tripDestinations.destinationId, id)).all()
  ])

  const blockers: string[] = []
  if (children.length) blockers.push(`${children.length} 個城市屬於它`)
  if (linkedSpots.length) blockers.push(`${linkedSpots.length} 個景點在這裡`)
  if (linkedTrips.length) blockers.push(`${linkedTrips.length} 個行程使用中`)

  if (blockers.length) {
    throw createError({
      statusCode: 409,
      statusMessage: `無法刪除「${existing.name}」：${blockers.join('、')}。請先解除這些關聯。`
    })
  }

  // 只剩照片關聯時可以刪，media_destinations 會 CASCADE 清掉（照片本身不會被刪）
  await db.delete(destinations).where(eq(destinations.id, id)).run()
  return { ok: true }
})
