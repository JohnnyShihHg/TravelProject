import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { contentSnippets } from '../../../database/schema'
import { sanitizeBlockData } from '../../../utils/sanitize-html-content'

interface UpdateSnippetBody {
  name?: string
  data?: unknown
  mode?: 'copy' | 'reference'
}

// 這支是 reference 模式真正的價值所在：改這裡，所有插入這個範本的行程會一起更新
// （getTripBlocks 讀的是 content_snippets.data，不是各自存的那份）。
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateSnippetBody>(event)

  const db = getDB(event)
  const existing = await db.select().from(contentSnippets).where(eq(contentSnippets.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到範本' })

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name) throw createError({ statusCode: 400, statusMessage: '範本名稱不能留空' })
    updates.name = name
  }
  if (body.data !== undefined) {
    // 範本內容一律會被插進行程頁面用 v-html 渲染，寫入前要清洗
    updates.data = JSON.stringify(sanitizeBlockData(body.data))
  }
  if (body.mode !== undefined) {
    if (body.mode !== 'copy' && body.mode !== 'reference') {
      throw createError({ statusCode: 400, statusMessage: '不支援的範本模式' })
    }
    updates.mode = body.mode
  }

  if (Object.keys(updates).length > 0) {
    await db.update(contentSnippets).set(updates).where(eq(contentSnippets.id, id)).run()
  }

  const row = (await db.select().from(contentSnippets).where(eq(contentSnippets.id, id)).get())!
  return { ...row, data: JSON.parse(row.data) }
})
