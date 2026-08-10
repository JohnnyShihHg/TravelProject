import { getDB } from '../utils/db'
import { listPublishedTrips } from '../utils/trips'
import { listDestinations, listSpots } from '../utils/places'

// 動態產生：後台發布行程或新增景點後，sitemap 自動包含，不需要人工維護。
// 手寫而非用 @nuxtjs/sitemap：整份規則就是「已發布的行程 + 所有地點 + 所有景點 + 四個靜態頁」，
// 資料量是幾十筆的等級，一支路由講得比模組設定更清楚。
interface SitemapEntry {
  path: string
  lastmod?: string
  changefreq: 'daily' | 'weekly' | 'monthly'
  priority: string
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, c => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;' }[c]!
  ))
}

export default defineEventHandler(async (event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl.replace(/\/$/, '')
  const db = getDB(event)

  const [trips, destinations, spots] = await Promise.all([
    listPublishedTrips(db), // 只有 published，草稿不會外流
    listDestinations(db),
    listSpots(db)
  ])

  const entries: SitemapEntry[] = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/trips', changefreq: 'daily', priority: '0.9' },
    { path: '/about', changefreq: 'monthly', priority: '0.5' },
    { path: '/contact', changefreq: 'monthly', priority: '0.5' },
    ...trips.map(t => ({
      path: `/trips/${t.slug}`,
      lastmod: t.updatedAt?.slice(0, 10),
      changefreq: 'weekly' as const,
      priority: '0.8'
    })),
    ...destinations.map(d => ({
      path: `/destinations/${d.slug}`,
      changefreq: 'weekly' as const,
      priority: d.type === 'country' ? '0.7' : '0.6'
    })),
    ...spots.map(s => ({
      path: `/spots/${s.slug}`,
      changefreq: 'monthly' as const,
      priority: '0.6'
    }))
  ]

  const body = entries.map(e => [
    '  <url>',
    `    <loc>${escapeXml(siteUrl + e.path)}</loc>`,
    ...(e.lastmod ? [`    <lastmod>${e.lastmod}</lastmod>`] : []),
    `    <changefreq>${e.changefreq}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    '  </url>'
  ].join('\n')).join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
})
