import { getDB } from '../../utils/db'
import { listPublishedTrips, getTripSearchText, isDomesticTrip } from '../../utils/trips'

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

  // 國內線／國外線改由 destinations.isDomestic 決定（設在國家上，城市看 parent）。
  // 還沒掛地點的行程 isDomesticTrip 回傳 null，兩邊都不會出現，避免被誤歸類。
  if (scope === 'domestic' || scope === 'overseas') {
    const wantDomestic = scope === 'domestic'
    items = items.filter((t) => {
      const domestic = isDomesticTrip(t)
      return domestic !== null && domestic === wantDomestic
    })
  }

  // tag 參數同時吃主題標籤、地點與景點的 slug 或名稱，
  // 前台各種入口（主題標籤列、目的地頁、景點頁）才能共用同一個 API
  if (tagFilter) {
    items = items.filter(t =>
      t.tags.some(tag => tag.name === tagFilter || tag.slug === tagFilter)
      || t.destinations.some(d => d.name === tagFilter || d.slug === tagFilter)
      || t.spots.some(s => s.name === tagFilter || s.slug === tagFilter)
    )
  }

  if (q) {
    const needle = q.toLowerCase()
    const searchTexts = await Promise.all(items.map(t => getTripSearchText(db, t.id)))
    items = items.filter((t, i) => {
      // 先比對結構化的關聯（主題標籤／地點／景點）。地點與景點以前也是 tag，
      // 拆表之後這裡一定要一起比對，否則搜「東京」「清水寺」會整個落空。
      const relationMatch = t.tags.some(tag => tag.name.toLowerCase().includes(needle))
        || t.destinations.some(d => d.name.toLowerCase().includes(needle))
        || t.spots.some(s => s.name.toLowerCase().includes(needle))
      if (relationMatch) return true
      // 比對不到再 fallback 到標題／摘要／內文，解決「標題有櫻花但沒建標籤」的落空問題
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
