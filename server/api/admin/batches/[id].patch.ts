import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { batches } from '../../../database/schema'

interface UpdateBatchBody {
  departureDate?: string
  returnDate?: string
  flightInfo?: string
  meetingPoint?: string
  priceInfo?: string
  groupSize?: number
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateBatchBody>(event)

  const db = getDB(event)
  await db.update(batches).set(body).where(eq(batches.id, id)).run()
  return db.select().from(batches).where(eq(batches.id, id)).get()
})
