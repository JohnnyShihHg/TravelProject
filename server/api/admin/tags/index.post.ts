import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { tags } from '../../../database/schema'
import { slugify, fallbackSlug } from '../../../utils/slug'

interface CreateTagBody {
  name: string
  /** 可省略：沒給就從名稱自動產生 */
  slug?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateTagBody>(event)
  const name = body.name?.trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: '請填寫標籤名稱' })

  const db = getDB(event)
  const existing = await db.select().from(tags).where(eq(tags.name, name)).get()
  if (existing) return existing

  // 中文名稱 slugify 後會是空字串，改用可辨識的暫時 slug（之後可在後台改）
  const slug = await uniqueSlug(db, body.slug?.trim() || slugify(name) || fallbackSlug('tag'))
  return db.insert(tags).values({ name, slug }).returning().get()
})

// 標籤名稱多半是中文，slugify 後容易撞在一起（例如都變成 tag-xxx），
// 所以插入前先確認沒被用掉，撞到就加序號。
async function uniqueSlug(db: ReturnType<typeof getDB>, base: string) {
  let candidate = base
  for (let i = 2; ; i++) {
    const taken = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, candidate)).get()
    if (!taken) return candidate
    candidate = `${base}-${i}`
  }
}
