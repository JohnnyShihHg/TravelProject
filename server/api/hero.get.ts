import { asc, eq } from 'drizzle-orm'
import { getDB } from '../utils/db'
import { heroContent, heroImages, media } from '../database/schema'
import { HERO_PAGES, isHeroPage } from '#shared/utils/hero-pages'

/**
 * 四個頁面的 hero 都打這支：?page=home|trips|about|contact（預設 home）。
 * 標題／副標只有首頁有（其他三頁的文案寫在各自的 .vue 裡，沒有後台可編輯的需求）。
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

  if (page !== 'home') return { page, title: null, subtitle: null, images }

  const content = await db.select().from(heroContent).get()
  return {
    page,
    title: content?.title ?? null,
    subtitle: content?.subtitle ?? null,
    images
  }
})
