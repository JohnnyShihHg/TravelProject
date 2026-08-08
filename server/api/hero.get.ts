import { db } from '../utils/db'
import { heroContent } from '../database/schema'

export default defineEventHandler(() => {
  return db.select().from(heroContent).get() ?? null
})
