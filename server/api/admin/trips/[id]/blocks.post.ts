import { eq } from 'drizzle-orm'
import { getDB } from '../../../../utils/db'
import { contentBlocks, CONTENT_BLOCK_TYPES } from '../../../../database/schema'
import type { ContentBlockType } from '../../../../database/schema'
import { defaultBlockData } from '../../../../utils/content-blocks'

interface CreateBlockBody {
  type: ContentBlockType
  data?: unknown
}

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'id'))
  const body = await readBody<CreateBlockBody>(event)

  if (!CONTENT_BLOCK_TYPES.includes(body.type)) {
    throw createError({ statusCode: 400, statusMessage: '不支援的區塊類型' })
  }

  const db = getDB(event)
  const existingBlocks = await db.select().from(contentBlocks).where(eq(contentBlocks.tripId, tripId)).all()
  const maxSort = existingBlocks.reduce((max, b) => Math.max(max, b.sortOrder), -1)

  const row = await db.insert(contentBlocks).values({
    tripId,
    type: body.type,
    sortOrder: maxSort + 1,
    data: JSON.stringify(body.data ?? defaultBlockData(body.type))
  }).returning().get()

  return { ...row, data: JSON.parse(row.data) }
})
