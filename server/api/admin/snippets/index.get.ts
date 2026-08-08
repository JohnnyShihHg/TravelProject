import { desc } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { contentSnippets } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = typeof query.type === 'string' ? query.type : undefined

  const db = getDB(event)
  const rows = await db.select().from(contentSnippets).orderBy(desc(contentSnippets.createdAt)).all()
  const parsed = rows.map(row => ({ ...row, data: JSON.parse(row.data) }))
  return type ? parsed.filter(s => s.type === type) : parsed
})
