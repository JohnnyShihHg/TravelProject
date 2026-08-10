import { eq } from 'drizzle-orm'
import { getDB } from '../../utils/db'
import { trips, batches } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const from = typeof query.from === 'string' ? query.from : undefined
  const to = typeof query.to === 'string' ? query.to : undefined

  const db = getDB(event)
  const rows = await db
    .select({
      batchId: batches.id,
      departureDate: batches.departureDate,
      returnDate: batches.returnDate,
      priceInfo: batches.priceInfo,
      priceFrom: batches.priceFrom,
      groupSize: batches.groupSize,
      tripId: trips.id,
      tripSlug: trips.slug,
      tripTitle: trips.title
    })
    .from(batches)
    .innerJoin(trips, eq(batches.tripId, trips.id))
    .where(eq(trips.status, 'published'))
    .all()

  const filtered = rows.filter((r) => {
    if (from && r.departureDate < from) return false
    if (to && r.departureDate > to) return false
    return true
  })

  filtered.sort((a, b) => a.departureDate.localeCompare(b.departureDate))

  return filtered
})
