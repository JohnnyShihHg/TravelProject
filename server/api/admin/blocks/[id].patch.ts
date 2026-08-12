import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { contentBlocks } from '../../../database/schema'
import { sanitizeBlockData } from '../../../utils/sanitize-html-content'

interface UpdateBlockBody {
  data: unknown
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateBlockBody>(event)

  const db = getDB(event)
  // 富文本會被前台用 v-html 原樣渲染，存進去之前一定要先清洗
  await db.update(contentBlocks)
    .set({ data: JSON.stringify(sanitizeBlockData(body.data)) })
    .where(eq(contentBlocks.id, id))
    .run()

  const row = await db.select().from(contentBlocks).where(eq(contentBlocks.id, id)).get()
  if (!row) throw createError({ statusCode: 404, statusMessage: '找不到區塊' })
  return { ...row, data: JSON.parse(row.data) }
})
