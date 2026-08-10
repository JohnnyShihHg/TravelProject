import { getDB } from '../../utils/db'
import { getSpotDetail } from '../../utils/places'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: '缺少景點代碼' })

  const db = getDB(event)
  const spot = await getSpotDetail(db, slug)
  if (!spot) throw createError({ statusCode: 404, statusMessage: '找不到這個景點' })

  return spot
})
