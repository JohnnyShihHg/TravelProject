import { asc, sql } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { tags, tripTags } from '../../../database/schema'

// 後台清單比公開版多帶使用中的行程數，刪除前才知道會影響什麼
export default defineEventHandler(async (event) => {
  const db = getDB(event)

  return db
    .select({
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
      tripCount: sql<number>`(SELECT COUNT(*) FROM ${tripTags} WHERE ${tripTags.tagId} = ${tags.id})`
    })
    .from(tags)
    .orderBy(asc(tags.name))
    .all()
})
