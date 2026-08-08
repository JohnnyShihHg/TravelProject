import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { batches } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = getDB(event)
  await db.delete(batches).where(eq(batches.id, id)).run()
  return { ok: true }
})
