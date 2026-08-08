import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { trips } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = getDB(event)
  await db.delete(trips).where(eq(trips.id, id)).run()
  return { ok: true }
})
