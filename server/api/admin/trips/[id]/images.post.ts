import { eq, and } from 'drizzle-orm'
import { db } from '../../../../utils/db'
import { tripImages } from '../../../../database/schema'

interface AttachImageBody {
  mediaId: number
  isCover?: boolean
}

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'id'))
  const body = await readBody<AttachImageBody>(event)
  if (!body.mediaId) throw createError({ statusCode: 400, statusMessage: '缺少 mediaId' })

  if (body.isCover) {
    db.update(tripImages).set({ isCover: false }).where(eq(tripImages.tripId, tripId)).run()
  }

  const existing = db.select().from(tripImages)
    .where(and(eq(tripImages.tripId, tripId), eq(tripImages.mediaId, body.mediaId)))
    .get()
  if (existing) {
    db.update(tripImages).set({ isCover: !!body.isCover }).where(eq(tripImages.id, existing.id)).run()
    return db.select().from(tripImages).where(eq(tripImages.id, existing.id)).get()
  }

  const maxSort = db.select().from(tripImages).where(eq(tripImages.tripId, tripId)).all()
    .reduce((max, i) => Math.max(max, i.sortOrder), -1)

  return db.insert(tripImages).values({
    tripId,
    mediaId: body.mediaId,
    isCover: !!body.isCover,
    sortOrder: maxSort + 1
  }).returning().get()
})
