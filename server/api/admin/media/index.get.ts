import { desc } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { media } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const category = typeof query.category === 'string' ? query.category : undefined

  const db = getDB(event)
  const rows = await db.select().from(media).orderBy(desc(media.createdAt)).all()
  return category ? rows.filter(m => m.category === category) : rows
})
