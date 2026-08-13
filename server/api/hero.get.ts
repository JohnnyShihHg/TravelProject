import { asc, eq } from 'drizzle-orm'
import { getDB } from '../utils/db'
import { heroContent, heroImages, media } from '../database/schema'
import { HERO_PAGES, isHeroPage } from '#shared/utils/hero-pages'

/**
 * 四個頁面的 hero 都打這支：?page=home|trips|about|contact（預設 home）。
 * 標題與分享圖只有首頁有（其他三頁的文案寫在各自的 .vue 裡，沒有後台可編輯的需求）。
 */
export default defineEventHandler(async (event) => {
  const requested = getQuery(event).page
  const page = typeof requested === 'string' && isHeroPage(requested) ? requested : HERO_PAGES[0]

  const db = getDB(event)

  const images = await db
    .select({ id: media.id, url: media.url })
    .from(heroImages)
    .innerJoin(media, eq(media.id, heroImages.mediaId))
    .where(eq(heroImages.page, page))
    .orderBy(asc(heroImages.sortOrder), asc(heroImages.id))
    .all()

  if (page !== 'home') return { page, title: null, ogImageUrl: null, images }

  const content = await db.select().from(heroContent).get()

  // 首頁手動指定的分享圖。查得到才回傳網址 —— 照片被刪掉時 og_media_id 會被
  // ON DELETE SET NULL 清成 null，這裡 JOIN 不到就自然回 null，前台會退回第一張 hero。
  const ogImage = content?.ogMediaId
    ? await db.select({ url: media.url }).from(media).where(eq(media.id, content.ogMediaId)).get()
    : null

  return {
    page,
    title: content?.title ?? null,
    ogImageUrl: ogImage?.url ?? null,
    images
  }
})
