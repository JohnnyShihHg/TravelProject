import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { tripImages } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = getDB(event)
  await db.delete(tripImages).where(eq(tripImages.id, id)).run()
  return { ok: true }
})
