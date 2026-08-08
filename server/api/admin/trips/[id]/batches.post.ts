import { db } from '../../../../utils/db'
import { batches } from '../../../../database/schema'

interface CreateBatchBody {
  departureDate: string
  returnDate: string
  flightInfo?: string
  meetingPoint?: string
  priceInfo?: string
  groupSize?: number
}

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'id'))
  const body = await readBody<CreateBatchBody>(event)

  if (!body.departureDate || !body.returnDate) {
    throw createError({ statusCode: 400, statusMessage: '請填寫出發日期與回程日期' })
  }

  return db.insert(batches).values({
    tripId,
    departureDate: body.departureDate,
    returnDate: body.returnDate,
    flightInfo: body.flightInfo || null,
    meetingPoint: body.meetingPoint || null,
    priceInfo: body.priceInfo || null,
    groupSize: body.groupSize ?? null
  }).returning().get()
})
