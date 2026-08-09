import { getDB } from '../../utils/db'
import { listPublishedTrips, getTripSearchText } from '../../utils/trips'

// 國內線＝帶有台灣地點標籤；國外線＝帶有台灣以外的地點標籤。
// 沒有任何地點標籤的行程兩邊都不會出現，避免被誤歸類。
const DOMESTIC_LOCATIONS = new Set(['台灣', '臺灣'])

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const tagFilter = typeof query.tag === 'string' ? query.tag.trim() : ''
  const scope = typeof query.scope === 'string' ? query.scope.trim() : ''
  const featuredOnly = query.featured === '1' || query.featured === 'true'

  let items = await listPublishedTrips(db)

  if (featuredOnly) {
    items = items.filter(t => t.isFeatured)
  }

  if (scope === 'domestic' || scope === 'overseas') {
    const wantDomestic = scope === 'domestic'
    items = items.filter(t => t.tags.some(
      tag => tag.category === 'location' && DOMESTIC_LOCATIONS.has(tag.name) === wantDomestic
    ))
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
