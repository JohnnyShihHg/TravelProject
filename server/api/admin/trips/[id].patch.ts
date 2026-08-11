import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { trips, tripTags, tags, tripDestinations, tripSpots, destinations, spots } from '../../../database/schema'
import { enrichTripDetail } from '../../../utils/trips'

interface UpdateTripBody {
  slug?: string
  title?: string
  summary?: string
  days?: number
  status?: 'draft' | 'published'
  isFeatured?: boolean
  badge?: string | null
  rank?: number
  seoTitle?: string | null
  seoDescription?: string | null
  tagNames?: string[]
  /** 覆寫地點關聯；第一個是主要地點（決定麵包屑路徑） */
  destinationIds?: number[]
  /** 覆寫景點關聯 */
  spotIds?: number[]
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateTripBody>(event)

  const db = getDB(event)
  const existing = await db.select().from(trips).where(eq(trips.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到行程' })

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (body.slug !== undefined) {
    const next = body.slug.trim()
    if (!next) throw createError({ statusCode: 400, statusMessage: '網址代稱不能留空' })
    // 只允許小寫英數與連字號——這是修中文 slug 壞資料（例如「北江」）的入口，不能再放中文進來
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(next)) {
      throw createError({ statusCode: 400, statusMessage: '網址代稱只能用小寫英文、數字與連字號' })
    }
    if (next !== existing.slug) {
      const dup = await db.select({ id: trips.id }).from(trips).where(eq(trips.slug, next)).get()
      if (dup) throw createError({ statusCode: 409, statusMessage: '這個網址代稱已經被使用' })
      updates.slug = next
    }
  }
  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.summary !== undefined) updates.summary = body.summary
  if (body.days !== undefined) updates.days = body.days
  if (body.status !== undefined) updates.status = body.status
  if (body.isFeatured !== undefined) updates.isFeatured = body.isFeatured
  // 空字串等同「不顯示標籤」，統一存成 null
  if (body.badge !== undefined) updates.badge = body.badge?.trim() || null
  if (body.rank !== undefined) updates.rank = body.rank
  // SEO 覆寫留空就存 null，前台會自動回退用 title / summary 產生
  if (body.seoTitle !== undefined) updates.seoTitle = body.seoTitle?.trim() || null
  if (body.seoDescription !== undefined) updates.seoDescription = body.seoDescription?.trim() || null

  await db.update(trips).set(updates).where(eq(trips.id, id)).run()

  if (body.tagNames !== undefined) {
    await db.delete(tripTags).where(eq(tripTags.tripId, id)).run()
    for (const name of body.tagNames) {
      const tag = await db.select().from(tags).where(eq(tags.name, name)).get()
      if (tag) await db.insert(tripTags).values({ tripId: id, tagId: tag.id }).run()
    }
  }

  if (body.destinationIds !== undefined) {
    await db.delete(tripDestinations).where(eq(tripDestinations.tripId, id)).run()
    // 陣列第一個是主要地點：一個行程可能跨多個城市，但麵包屑只能有一條路徑
    for (const [index, destinationId] of [...new Set(body.destinationIds)].entries()) {
      const found = await db.select({ id: destinations.id }).from(destinations)
        .where(eq(destinations.id, destinationId)).get()
      if (found) {
        await db.insert(tripDestinations).values({
          tripId: id, destinationId: found.id, isPrimary: index === 0
        }).run()
      }
    }
  }

  if (body.spotIds !== undefined) {
    await db.delete(tripSpots).where(eq(tripSpots.tripId, id)).run()
    for (const spotId of [...new Set(body.spotIds)]) {
      const found = await db.select({ id: spots.id }).from(spots).where(eq(spots.id, spotId)).get()
      if (found) await db.insert(tripSpots).values({ tripId: id, spotId: found.id }).run()
    }
  }

  const updated = (await db.select().from(trips).where(eq(trips.id, id)).get())!
  return enrichTripDetail(db, updated)
})
