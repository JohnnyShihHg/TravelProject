import { eq } from 'drizzle-orm'
import { db } from '../../../../../utils/db'
import { contentBlocks, contentSnippets } from '../../../../../database/schema'

interface FromSnippetBody {
  snippetId: number
}

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'id'))
  const body = await readBody<FromSnippetBody>(event)

  const snippet = db.select().from(contentSnippets).where(eq(contentSnippets.id, body.snippetId)).get()
  if (!snippet) throw createError({ statusCode: 404, statusMessage: '找不到範本' })

  const existingBlocks = db.select().from(contentBlocks).where(eq(contentBlocks.tripId, tripId)).all()
  const maxSort = existingBlocks.reduce((max, b) => Math.max(max, b.sortOrder), -1)

  // 插入時複製一份，之後修改範本庫不會影響已經插入的行程（反之亦然）
  const row = db.insert(contentBlocks).values({
    tripId,
    type: snippet.type,
    sortOrder: maxSort + 1,
    data: snippet.data
  }).returning().get()

  return { ...row, data: JSON.parse(row.data) }
})
