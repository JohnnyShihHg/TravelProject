import { eq, and, ne } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { destinations, media } from '../../../database/schema'

interface UpdateDestinationBody {
  name?: string
  slug?: string
  parentId?: number | null
  isDomestic?: boolean
  description?: string | null
  /** 設定封面圖，null 代表清除 */
  coverMediaId?: number | null
  rank?: number
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateDestinationBody>(event)

  const db = getDB(event)
  const existing = await db.select().from(destinations).where(eq(destinations.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到這個目的地' })

  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name) throw createError({ statusCode: 400, statusMessage: '名稱不能空白' })
    updates.name = name
  }

  if (body.slug !== undefined) {
    const slug = body.slug.trim()
    if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug 不能空白' })
    const taken = await db.select({ id: destinations.id }).from(destinations)
      .where(and(eq(destinations.slug, slug), ne(destinations.id, id))).get()
    if (taken) throw createError({ statusCode: 409, statusMessage: '這個 slug 已經被使用' })
    updates.slug = slug
  }

  if (body.parentId !== undefined) {
    if (existing.type === 'country') {
      throw createError({ statusCode: 400, statusMessage: '國家沒有所屬上層' })
    }
    if (!body.parentId) throw createError({ statusCode: 400, statusMessage: '城市必須有所屬國家' })
    if (body.parentId === id) throw createError({ statusCode: 400, statusMessage: '不能把自己設為所屬國家' })
    const parent = await db.select().from(destinations).where(eq(destinations.id, body.parentId)).get()
    if (!parent || parent.type !== 'country') {
      throw createError({ statusCode: 400, statusMessage: '所屬國家必須是國家層級' })
    }
    updates.parentId = parent.id
  }

  // isDomestic 只在國家層級有意義
  if (body.isDomestic !== undefined && existing.type === 'country') {
    updates.isDomestic = body.isDomestic
  }

  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.rank !== undefined) updates.rank = body.rank

  if (body.coverMediaId !== undefined) {
    if (body.coverMediaId === null) {
      updates.coverMediaId = null
    } else {
      const found = await db.select({ id: media.id }).from(media).where(eq(media.id, body.coverMediaId)).get()
      if (!found) throw createError({ statusCode: 400, statusMessage: '找不到這張照片' })
      updates.coverMediaId = body.coverMediaId
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(destinations).set(updates).where(eq(destinations.id, id)).run()
  }

  return db.select().from(destinations).where(eq(destinations.id, id)).get()
})
