import { getDB } from '../utils/db'
import { heroContent } from '../database/schema'

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  return (await db.select().from(heroContent).get()) ?? null
})
