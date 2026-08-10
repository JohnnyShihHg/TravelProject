import { eq, and, ne } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { tags } from '../../../database/schema'

interface UpdateTagBody {
  name?: string
  slug?: string
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateTagBody>(event)

  const db = getDB(event)
  const existing = await db.select().from(tags).where(eq(tags.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到這個標籤' })

  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name) throw createError({ statusCode: 400, statusMessage: '標籤名稱不能空白' })
    const taken = await db.select({ id: tags.id }).from(tags)
      .where(and(eq(tags.name, name), ne(tags.id, id))).get()
    if (taken) throw createError({ statusCode: 409, statusMessage: '已經有同名的標籤' })
    updates.name = name
  }

  if (body.slug !== undefined) {
    const slug = body.slug.trim()
    if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug 不能空白' })
    const taken = await db.select({ id: tags.id }).from(tags)
      .where(and(eq(tags.slug, slug), ne(tags.id, id))).get()
    if (taken) throw createError({ statusCode: 409, statusMessage: '這個 slug 已經被使用' })
    updates.slug = slug
  }

  if (Object.keys(updates).length > 0) {
    await db.update(tags).set(updates).where(eq(tags.id, id)).run()
  }

  return db.select().from(tags).where(eq(tags.id, id)).get()
})
