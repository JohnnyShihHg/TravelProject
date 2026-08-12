import { eq } from 'drizzle-orm'
import { getDB } from '../../../../../utils/db'
import { contentBlocks, contentSnippets } from '../../../../../database/schema'
import { defaultBlockData } from '../../../../../utils/content-blocks'

interface FromSnippetBody {
  snippetId: number
}

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'id'))
  const body = await readBody<FromSnippetBody>(event)

  const db = getDB(event)
  const snippet = await db.select().from(contentSnippets).where(eq(contentSnippets.id, body.snippetId)).get()
  if (!snippet) throw createError({ statusCode: 404, statusMessage: '找不到範本' })

  const existingBlocks = await db.select().from(contentBlocks).where(eq(contentBlocks.tripId, tripId)).all()
  const maxSort = existingBlocks.reduce((max, b) => Math.max(max, b.sortOrder), -1)

  const isReference = snippet.mode === 'reference'
  const row = await db.insert(contentBlocks).values({
    tripId,
    type: snippet.type,
    sortOrder: maxSort + 1,
    // copy：插入時複製一份，之後修改範本庫不會影響已經插入的行程（反之亦然）。
    // reference：data 存這個類型的預設空殼當 fallback（範本被刪掉時 getTripBlocks 讀不到
    // 才會用上，此時前台元件至少不會因為缺 html/legs/days 而整段炸開），
    // 實際內容一律讀 content_snippets.data，範本改一次全部引用處一起更新。
    data: isReference ? JSON.stringify(defaultBlockData(snippet.type)) : snippet.data,
    snippetId: isReference ? snippet.id : null
  }).returning().get()

  // 回傳給前端時要跟 getTripBlocks 的行為一致：reference 模式回傳範本的即時內容
  return { ...row, data: JSON.parse(isReference ? snippet.data : row.data) }
})
