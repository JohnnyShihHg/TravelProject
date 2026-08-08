import { db } from '../../utils/db'
import { tags } from '../../database/schema'

export default defineEventHandler(() => {
  return db.select().from(tags).all()
})
