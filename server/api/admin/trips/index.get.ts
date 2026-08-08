import { desc } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { trips } from '../../../database/schema'
import { enrichTrip } from '../../../utils/trips'

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const rows = await db.select().from(trips).orderBy(desc(trips.updatedAt)).all()
  return Promise.all(rows.map(trip => enrichTrip(db, trip)))
})
