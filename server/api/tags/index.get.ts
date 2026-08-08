import { getDB } from '../../utils/db'
import { tags } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  return db.select().from(tags).all()
})
