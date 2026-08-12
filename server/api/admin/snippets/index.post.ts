import { getDB } from '../../../utils/db'
import { contentSnippets, CONTENT_BLOCK_TYPES } from '../../../database/schema'
import type { ContentBlockType } from '../../../database/schema'
import { sanitizeBlockData } from '../../../utils/sanitize-html-content'

interface CreateSnippetBody {
  name: string
  type: ContentBlockType
  data: unknown
  /** copy（預設）= 插入時複製一份，各自獨立；reference = 插入的是連動，改範本全部一起更新 */
  mode?: 'copy' | 'reference'
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateSnippetBody>(event)

  if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: '請填寫範本名稱' })
  if (!CONTENT_BLOCK_TYPES.includes(body.type)) throw createError({ statusCode: 400, statusMessage: '不支援的區塊類型' })
  if (body.mode !== undefined && body.mode !== 'copy' && body.mode !== 'reference') {
    throw createError({ statusCode: 400, statusMessage: '不支援的範本模式' })
  }

  const db = getDB(event)
  const row = await db.insert(contentSnippets).values({
    name: body.name.trim(),
    type: body.type,
    // 範本之後會被插進行程內容、由前台 v-html 渲染，同樣要先清洗
    data: JSON.stringify(sanitizeBlockData(body.data)),
    ...(body.mode !== undefined ? { mode: body.mode } : {})
  }).returning().get()

  return { ...row, data: JSON.parse(row.data) }
})
