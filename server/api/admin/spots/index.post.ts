import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { spots, destinations } from '../../../database/schema'
import { slugify, fallbackSlug, ensureUniqueSlug } from '../../../utils/slug'

interface CreateSpotBody {
  name: string
  slug?: string
  destinationId?: number | null
  description?: string | null
  address?: string | null
  lat?: string | null
  lng?: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateSpotBody>(event)
  const name = body.name?.trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: '請填寫景點名稱' })

  const db = getDB(event)

  // 所在地可以是國家或城市：像富士山就不屬於任何單一城市
  let destinationId: number | null = null
  if (body.destinationId) {
    const found = await db.select({ id: destinations.id }).from(destinations)
      .where(eq(destinations.id, body.destinationId)).get()
    if (!found) throw createError({ statusCode: 400, statusMessage: '找不到所在地' })
    destinationId = found.id
  }

  const slug = await ensureUniqueSlug(
    body.slug?.trim() || slugify(name) || fallbackSlug('spot'),
    async s => !!(await db.select({ id: spots.id }).from(spots).where(eq(spots.slug, s)).get())
  )

  return db.insert(spots).values({
    slug,
    name,
    destinationId,
    description: body.description?.trim() || null,
    address: body.address?.trim() || null,
    lat: body.lat?.trim() || null,
    lng: body.lng?.trim() || null
  }).returning().get()
})
