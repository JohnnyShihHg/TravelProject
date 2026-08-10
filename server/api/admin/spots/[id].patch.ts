import { eq, and, ne } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { spots, destinations, media } from '../../../database/schema'

interface UpdateSpotBody {
  name?: string
  slug?: string
  destinationId?: number | null
  description?: string | null
  address?: string | null
  lat?: string | null
  lng?: string | null
  /** 設定封面圖，null 代表清除 */
  coverMediaId?: number | null
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateSpotBody>(event)

  const db = getDB(event)
  const existing = await db.select().from(spots).where(eq(spots.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到這個景點' })

  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name) throw createError({ statusCode: 400, statusMessage: '名稱不能空白' })
    updates.name = name
  }

  if (body.slug !== undefined) {
    const slug = body.slug.trim()
    if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug 不能空白' })
    const taken = await db.select({ id: spots.id }).from(spots)
      .where(and(eq(spots.slug, slug), ne(spots.id, id))).get()
    if (taken) throw createError({ statusCode: 409, statusMessage: '這個 slug 已經被使用' })
    updates.slug = slug
  }

  if (body.destinationId !== undefined) {
    if (body.destinationId === null) {
      updates.destinationId = null
    } else {
      const found = await db.select({ id: destinations.id }).from(destinations)
        .where(eq(destinations.id, body.destinationId)).get()
      if (!found) throw createError({ statusCode: 400, statusMessage: '找不到所在地' })
      updates.destinationId = found.id
    }
  }

  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.address !== undefined) updates.address = body.address?.trim() || null
  if (body.lat !== undefined) updates.lat = body.lat?.trim() || null
  if (body.lng !== undefined) updates.lng = body.lng?.trim() || null

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
    await db.update(spots).set(updates).where(eq(spots.id, id)).run()
  }

  return db.select().from(spots).where(eq(spots.id, id)).get()
})
