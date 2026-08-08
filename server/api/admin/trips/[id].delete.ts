import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { trips } from '../../../database/schema'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  db.delete(trips).where(eq(trips.id, id)).run()
  return { ok: true }
})
