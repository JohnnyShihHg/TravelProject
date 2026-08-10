import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { media } from '../../../database/schema'
import { setMediaLinks } from '../../../utils/media-links'

interface UpdateMediaBody {
  /** 覆寫這張照片掛的地點；省略代表不動 */
  destinationIds?: number[]
  /** 覆寫這張照片掛的景點；省略代表不動 */
  spotIds?: number[]
}

// 掛上關聯之後，對應的 /destinations/[slug]、/spots/[slug] 相簿會自動出現這張照片
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateMediaBody>(event)

  const db = getDB(event)
  const existing = await db.select().from(media).where(eq(media.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到這張照片' })

  const updated = await setMediaLinks(db, id, {
    destinationIds: body.destinationIds,
    spotIds: body.spotIds
  })
  return updated ?? { ...existing, destinations: [], spots: [] }
})
