import { db } from '../../../utils/db'
import { media } from '../../../database/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const category = typeof query.category === 'string' ? query.category : undefined

  const rows = db.select().from(media).orderBy(desc(media.createdAt)).all()
  return category ? rows.filter(m => m.category === category) : rows
})
