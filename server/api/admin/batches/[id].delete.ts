import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { batches } from '../../../database/schema'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  db.delete(batches).where(eq(batches.id, id)).run()
  return { ok: true }
})
