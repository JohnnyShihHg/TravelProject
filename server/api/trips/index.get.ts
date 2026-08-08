import { listPublishedTrips } from '../../utils/trips'

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '')
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const tagFilter = typeof query.tag === 'string' ? query.tag.trim() : ''
  const featuredOnly = query.featured === '1' || query.featured === 'true'

  let items = listPublishedTrips()

  if (featuredOnly) {
    items = items.filter(t => t.isFeatured)
  }

  if (tagFilter) {
    items = items.filter(t => t.tags.some(tag => tag.name === tagFilter))
  }

  if (q) {
    const needle = q.toLowerCase()
    items = items.filter((t) => {
      const tagMatch = t.tags.some(tag => tag.name.toLowerCase().includes(needle))
      if (tagMatch) return true
      const textMatch = `${t.title} ${t.summary} ${stripHtml(t.content)}`.toLowerCase().includes(needle)
      return textMatch
    })
  }

  items.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.title.localeCompare(b.title, 'zh-Hant')
  })

  return items.map(({ content: _content, ...rest }) => rest)
})
