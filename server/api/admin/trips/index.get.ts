import { db } from '../../../utils/db'
import { trips } from '../../../database/schema'
import { enrichTrip } from '../../../utils/trips'
import { desc } from 'drizzle-orm'

export default defineEventHandler(() => {
  const rows = db.select().from(trips).orderBy(desc(trips.updatedAt)).all()
  return rows.map(enrichTrip)
})
