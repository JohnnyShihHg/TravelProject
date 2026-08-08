import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { contentSnippets } from '../../../database/schema'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  db.delete(contentSnippets).where(eq(contentSnippets.id, id)).run()
  return { ok: true }
})
