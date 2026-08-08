import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { contentBlocks } from '../../../database/schema'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  db.delete(contentBlocks).where(eq(contentBlocks.id, id)).run()
  return { ok: true }
})
