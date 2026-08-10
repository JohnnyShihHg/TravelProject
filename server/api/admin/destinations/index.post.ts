import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { destinations } from '../../../database/schema'
import { slugify, fallbackSlug, ensureUniqueSlug } from '../../../utils/slug'

interface CreateDestinationBody {
  name: string
  type: 'country' | 'city'
  slug?: string
  parentId?: number | null
  isDomestic?: boolean
  description?: string | null
  rank?: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateDestinationBody>(event)
  const name = body.name?.trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: '請填寫名稱' })
  if (body.type !== 'country' && body.type !== 'city') {
    throw createError({ statusCode: 400, statusMessage: '類型只能是國家或城市' })
  }

  const db = getDB(event)

  // 城市一定要有所屬國家，否則麵包屑與國內線判斷都會斷掉
  let parentId: number | null = null
  if (body.type === 'city') {
    if (!body.parentId) throw createError({ statusCode: 400, statusMessage: '城市必須選擇所屬國家' })
    const parent = await db.select().from(destinations).where(eq(destinations.id, body.parentId)).get()
    if (!parent) throw createError({ statusCode: 400, statusMessage: '找不到所屬國家' })
    if (parent.type !== 'country') throw createError({ statusCode: 400, statusMessage: '所屬國家必須是國家層級' })
    parentId = parent.id
  }

  const slug = await ensureUniqueSlug(
    body.slug?.trim() || slugify(name) || fallbackSlug('place'),
    async s => !!(await db.select({ id: destinations.id }).from(destinations).where(eq(destinations.slug, s)).get())
  )

  return db.insert(destinations).values({
    slug,
    name,
    type: body.type,
    parentId,
    // isDomestic 只在國家層級有意義，城市一律看 parent
    isDomestic: body.type === 'country' ? (body.isDomestic ?? false) : false,
    description: body.description?.trim() || null,
    rank: body.rank ?? 0
  }).returning().get()
})
