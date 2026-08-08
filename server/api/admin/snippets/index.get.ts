import { desc } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { contentSnippets } from '../../../database/schema'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const type = typeof query.type === 'string' ? query.type : undefined

  const rows = db.select().from(contentSnippets).orderBy(desc(contentSnippets.createdAt)).all()
  const parsed = rows.map(row => ({ ...row, data: JSON.parse(row.data) }))
  return type ? parsed.filter(s => s.type === type) : parsed
})
