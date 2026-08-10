import { getDB } from '../../utils/db'
import { getDestinationDetail } from '../../utils/places'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: '缺少地點代碼' })

  const db = getDB(event)
  const destination = await getDestinationDetail(db, slug)
  if (!destination) throw createError({ statusCode: 404, statusMessage: '找不到這個目的地' })

  return destination
})
