import { eq, and } from 'drizzle-orm'
import { getDB } from '../../../../../utils/db'
import { contentBlocks } from '../../../../../database/schema'

interface ReorderBody {
  blockIds: number[]
}

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'id'))
  const body = await readBody<ReorderBody>(event)
  const db = getDB(event)

  for (const [index, blockId] of body.blockIds.entries()) {
    await db.update(contentBlocks)
      .set({ sortOrder: index })
      .where(and(eq(contentBlocks.id, blockId), eq(contentBlocks.tripId, tripId)))
      .run()
  }

  return { ok: true }
})
