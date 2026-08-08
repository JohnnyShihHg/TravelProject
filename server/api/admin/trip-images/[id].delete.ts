import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { tripImages } from '../../../database/schema'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  db.delete(tripImages).where(eq(tripImages.id, id)).run()
  return { ok: true }
})
