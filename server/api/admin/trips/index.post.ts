import { db } from '../../../utils/db'
import { trips, tripTags, tags } from '../../../database/schema'
import { eq } from 'drizzle-orm'

interface CreateTripBody {
  slug?: string
  title: string
  summary: string
  days: number
  tagNames?: string[]
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/(^-|-$)/g, '') || `trip-${Date.now()}`
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateTripBody>(event)
  if (!body.title?.trim()) throw createError({ statusCode: 400, statusMessage: '請填寫行程標題' })

  const slug = body.slug?.trim() || slugify(body.title)
  const existing = db.select().from(trips).where(eq(trips.slug, slug)).get()
  if (existing) throw createError({ statusCode: 409, statusMessage: '這個網址代稱（slug）已經被使用' })

  const trip = db.insert(trips).values({
    slug,
    title: body.title.trim(),
    summary: body.summary?.trim() || '',
    days: body.days || 1,
    status: 'draft',
    isFeatured: false,
    rank: 0
  }).returning().get()

  for (const name of body.tagNames ?? []) {
    const tag = db.select().from(tags).where(eq(tags.name, name)).get()
    if (tag) db.insert(tripTags).values({ tripId: trip.id, tagId: tag.id }).run()
  }

  return trip
})
