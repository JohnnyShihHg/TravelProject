import { eq } from 'drizzle-orm'
import { getDB } from '../../utils/db'
import { heroContent } from '../../database/schema'

interface UpdateHeroBody {
  title: string
  subtitle: string
  imageUrl: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<UpdateHeroBody>(event)
  const db = getDB(event)
  const existing = await db.select().from(heroContent).get()

  if (!existing) {
    return db.insert(heroContent).values(body).returning().get()
  }

  await db.update(heroContent).set({ ...body, updatedAt: new Date().toISOString() }).where(eq(heroContent.id, existing.id)).run()
  return db.select().from(heroContent).where(eq(heroContent.id, existing.id)).get()
})
