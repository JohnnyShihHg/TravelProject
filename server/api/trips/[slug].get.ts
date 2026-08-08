import { eq } from 'drizzle-orm'
import { db } from '../../utils/db'
import { trips } from '../../database/schema'
import { enrichTripDetail } from '../../utils/trips'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing slug' })

  const trip = db.select().from(trips).where(eq(trips.slug, slug)).get()
  if (!trip || trip.status !== 'published') {
    throw createError({ statusCode: 404, statusMessage: 'Trip not found' })
  }

  return enrichTripDetail(trip)
})
