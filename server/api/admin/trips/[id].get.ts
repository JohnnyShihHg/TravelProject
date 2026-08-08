import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { trips } from '../../../database/schema'
import { enrichTripDetail } from '../../../utils/trips'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  const trip = db.select().from(trips).where(eq(trips.id, id)).get()
  if (!trip) throw createError({ statusCode: 404, statusMessage: '找不到行程' })
  return enrichTripDetail(trip)
})
