import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { contactSubmissions } from '../../../database/schema'

interface UpdateContactBody {
  isRead: boolean
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateContactBody>(event)

  const db = getDB(event)
  const existing = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: '找不到這筆留言' })

  await db.update(contactSubmissions)
    .set({ isRead: !!body.isRead })
    .where(eq(contactSubmissions.id, id))
    .run()

  return db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id)).get()
})
