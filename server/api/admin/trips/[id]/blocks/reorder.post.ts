import { eq, and } from 'drizzle-orm'
import { db } from '../../../../../utils/db'
import { contentBlocks } from '../../../../../database/schema'

interface ReorderBody {
  blockIds: number[]
}

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'id'))
  const body = await readBody<ReorderBody>(event)

  body.blockIds.forEach((blockId, index) => {
    db.update(contentBlocks)
      .set({ sortOrder: index })
      .where(and(eq(contentBlocks.id, blockId), eq(contentBlocks.tripId, tripId)))
      .run()
  })

  return { ok: true }
})
