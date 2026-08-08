import { getDB } from '../../../utils/db'
import { contentSnippets, CONTENT_BLOCK_TYPES } from '../../../database/schema'
import type { ContentBlockType } from '../../../database/schema'

interface CreateSnippetBody {
  name: string
  type: ContentBlockType
  data: unknown
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateSnippetBody>(event)

  if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: '請填寫範本名稱' })
  if (!CONTENT_BLOCK_TYPES.includes(body.type)) throw createError({ statusCode: 400, statusMessage: '不支援的區塊類型' })

  const db = getDB(event)
  const row = await db.insert(contentSnippets).values({
    name: body.name.trim(),
    type: body.type,
    data: JSON.stringify(body.data)
  }).returning().get()

  return { ...row, data: JSON.parse(row.data) }
})
