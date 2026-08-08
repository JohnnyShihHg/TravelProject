import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { tags } from '../../../database/schema'

interface CreateTagBody {
  name: string
  category: 'location' | 'attraction' | 'type'
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateTagBody>(event)
  if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: '請填寫標籤名稱' })

  const existing = db.select().from(tags).where(eq(tags.name, body.name.trim())).get()
  if (existing) return existing

  return db.insert(tags).values({ name: body.name.trim(), category: body.category }).returning().get()
})
