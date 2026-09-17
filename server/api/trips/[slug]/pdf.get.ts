import type { BrowserWorker } from '@cloudflare/puppeteer'
import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { trips } from '../../../database/schema'

/**
 * 行程頁「下載 PDF」。用 Cloudflare Browser Rendering 開一顆真的無頭瀏覽器，
 * 直接導到這個行程自己的公開網址印成 PDF —— 這樣排版永遠跟訪客實際看到的頁面一致，
 * 不用另外維護一份 PDF 專用樣板。
 *
 * 前提：Cloudflare 帳號要先開通 Browser Rendering（付費功能），並在 wrangler.jsonc
 * 設定 `browser` binding，本機 `wrangler dev` 模擬不出來，要用 `wrangler dev --remote`
 * 或直接對已部署環境測試。
 */

interface CloudflareEventContext {
  context?: { cloudflare?: { env?: { BROWSER?: BrowserWorker } } }
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing slug' })

  const db = getDB(event)
  const trip = await db.select().from(trips).where(eq(trips.slug, slug)).get()
  if (!trip || trip.status !== 'published') {
    throw createError({ statusCode: 404, statusMessage: 'Trip not found' })
  }

  const browserBinding = (event as unknown as CloudflareEventContext)?.context?.cloudflare?.env?.BROWSER
  if (!browserBinding) {
    throw createError({
      statusCode: 501,
      statusMessage: 'PDF 匯出尚未設定：Cloudflare 帳號需要先開通 Browser Rendering'
    })
  }

  const { siteUrl } = useRuntimeConfig(event).public
  const tripUrl = `${siteUrl}/trips/${slug}`

  // 型別套件只有 devDependency，執行期用動態 import 避免本機沒開 Browser Rendering 時
  // 連 import 都失敗（例如本機 dev 環境）。
  const { default: puppeteer } = await import('@cloudflare/puppeteer')
  const browser = await puppeteer.launch(browserBinding)
  try {
    const page = await browser.newPage()
    await page.goto(tripUrl, { waitUntil: 'networkidle0' })
    // 頁面上的圖片多半是 loading="lazy"，無頭瀏覽器不會捲動，畫面外的圖不會載入，
    // 印出來會是空白 —— 先全部改成 eager 並等它們載完
    await page.evaluate(async () => {
      const images = Array.from(document.images)
      for (const img of images) img.loading = 'eager'
      const allLoaded = Promise.all(images.map(img => (img.complete ? null : new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true })
        img.addEventListener('error', resolve, { once: true })
      }))))
      // 最多等 10 秒，單張圖卡住不該讓整個匯出失敗
      await Promise.race([allLoaded, new Promise(resolve => setTimeout(resolve, 10_000))])
    })
    const pdf = await page.pdf({ format: 'A4', printBackground: true })

    setResponseHeader(event, 'content-type', 'application/pdf')
    setResponseHeader(event, 'content-disposition', `attachment; filename="${slug}.pdf"`)
    return pdf
  } finally {
    await browser.close()
  }
})
