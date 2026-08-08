import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { contentBlocks } from '../../../database/schema'

interface UpdateBlockBody {
  data: unknown
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateBlockBody>(event)

  db.update(contentBlocks).set({ data: JSON.stringify(body.data) }).where(eq(contentBlocks.id, id)).run()

  const row = db.select().from(contentBlocks).where(eq(contentBlocks.id, id)).get()
  if (!row) throw createError({ statusCode: 404, statusMessage: '找不到區塊' })
  return { ...row, data: JSON.parse(row.data) }
})
