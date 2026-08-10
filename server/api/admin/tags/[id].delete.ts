import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { tags, tripTags } from '../../../database/schema'

// trip_tags 的外鍵是 CASCADE，直接刪會讓行程無聲無息少掉標籤，
// 所以還被使用中就擋下並說明卡在哪裡（與目的地、景點的處理方式一致）。
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const db = getDB(event)
  const existing = await db.select().from(tags).where(eq(tags.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到這個標籤' })

  const linked = await db.select({ tripId: tripTags.tripId })
    .from(tripTags).where(eq(tripTags.tagId, id)).all()

  if (linked.length) {
    throw createError({
      statusCode: 409,
      statusMessage: `無法刪除「${existing.name}」：${linked.length} 個行程使用中。請先從那些行程移除這個標籤。`
    })
  }

  await db.delete(tags).where(eq(tags.id, id)).run()
  return { ok: true }
})
