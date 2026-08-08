import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { trips } from '../../../database/schema'
import { enrichTripDetail } from '../../../utils/trips'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = getDB(event)
  const trip = await db.select().from(trips).where(eq(trips.id, id)).get()
  if (!trip) throw createError({ statusCode: 404, statusMessage: '找不到行程' })
  return enrichTripDetail(db, trip)
})
