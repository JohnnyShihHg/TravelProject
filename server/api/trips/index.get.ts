import { getDB } from '../../utils/db'
import { listPublishedTrips, getTripSearchText } from '../../utils/trips'

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const tagFilter = typeof query.tag === 'string' ? query.tag.trim() : ''
  const featuredOnly = query.featured === '1' || query.featured === 'true'

  let items = await listPublishedTrips(db)

  if (featuredOnly) {
    items = items.filter(t => t.isFeatured)
  }

  if (tagFilter) {
    items = items.filter(t => t.tags.some(tag => tag.name === tagFilter))
  }

  if (q) {
    const needle = q.toLowerCase()
    const searchTexts = await Promise.all(items.map(t => getTripSearchText(db, t.id)))
    items = items.filter((t, i) => {
      const tagMatch = t.tags.some(tag => tag.name.toLowerCase().includes(needle))
      if (tagMatch) return true
      const textMatch = `${t.title} ${t.summary} ${searchTexts[i]}`.toLowerCase().includes(needle)
      return textMatch
    })
  }

  items.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.title.localeCompare(b.title, 'zh-Hant')
  })

  return items
})
