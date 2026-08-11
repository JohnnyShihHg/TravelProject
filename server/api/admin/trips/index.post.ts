import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { trips, tripTags, tags } from '../../../database/schema'
import { slugify, fallbackSlug, ensureUniqueSlug } from '../../../utils/slug'
import { setTripDestinations, setTripSpots } from '../../../utils/places'

interface CreateTripBody {
  slug?: string
  title: string
  summary: string
  days: number
  tagNames?: string[]
  /** 陣列第一個是主要地點（決定麵包屑路徑） */
  destinationIds?: number[]
  spotIds?: number[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateTripBody>(event)
  if (!body.title?.trim()) throw createError({ statusCode: 400, statusMessage: '請填寫行程標題' })

  const db = getDB(event)
  const exists = async (s: string) => !!(await db.select({ id: trips.id }).from(trips).where(eq(trips.slug, s)).get())

  let slug: string
  const manualSlug = body.slug?.trim()
  if (manualSlug) {
    // 使用者手動指定的 slug 撞到要報錯讓他自己決定，不能靜默改寫成 -2 這種變體
    if (await exists(manualSlug)) throw createError({ statusCode: 409, statusMessage: '這個網址代稱（slug）已經被使用' })
    slug = manualSlug
  } else {
    // 自動產生的才用 ensureUniqueSlug 加序號；全中文標題轉不出英數字時 fallback 成 trip-xxxxx
    slug = await ensureUniqueSlug(slugify(body.title) || fallbackSlug('trip'), exists)
  }

  const trip = await db.insert(trips).values({
    slug,
    title: body.title.trim(),
    summary: body.summary?.trim() || '',
    days: body.days || 1,
    status: 'draft',
    isFeatured: false,
    rank: 0
  }).returning().get()

  for (const name of body.tagNames ?? []) {
    const tag = await db.select().from(tags).where(eq(tags.name, name)).get()
    if (tag) await db.insert(tripTags).values({ tripId: trip.id, tagId: tag.id }).run()
  }

  if (body.destinationIds?.length) await setTripDestinations(db, trip.id, body.destinationIds)
  if (body.spotIds?.length) await setTripSpots(db, trip.id, body.spotIds)

  return trip
})
