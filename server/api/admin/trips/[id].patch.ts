import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { trips, tripTags, tags } from '../../../database/schema'
import { enrichTripDetail } from '../../../utils/trips'

interface UpdateTripBody {
  title?: string
  summary?: string
  days?: number
  status?: 'draft' | 'published'
  isFeatured?: boolean
  badge?: string | null
  rank?: number
  tagNames?: string[]
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateTripBody>(event)

  const db = getDB(event)
  const existing = await db.select().from(trips).where(eq(trips.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到行程' })

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.summary !== undefined) updates.summary = body.summary
  if (body.days !== undefined) updates.days = body.days
  if (body.status !== undefined) updates.status = body.status
  if (body.isFeatured !== undefined) updates.isFeatured = body.isFeatured
  // 空字串等同「不顯示標籤」，統一存成 null
  if (body.badge !== undefined) updates.badge = body.badge?.trim() || null
  if (body.rank !== undefined) updates.rank = body.rank

  await db.update(trips).set(updates).where(eq(trips.id, id)).run()

  if (body.tagNames !== undefined) {
    await db.delete(tripTags).where(eq(tripTags.tripId, id)).run()
    for (const name of body.tagNames) {
      const tag = await db.select().from(tags).where(eq(tags.name, name)).get()
      if (tag) await db.insert(tripTags).values({ tripId: id, tagId: tag.id }).run()
    }
  }

  const updated = (await db.select().from(trips).where(eq(trips.id, id)).get())!
  return enrichTripDetail(db, updated)
})
