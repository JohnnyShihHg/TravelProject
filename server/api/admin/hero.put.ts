import { eq, inArray } from 'drizzle-orm'
import { getDB } from '../../utils/db'
import { heroContent, heroImages, media } from '../../database/schema'
import { HERO_PAGES, isHeroPage } from '#shared/utils/hero-pages'

interface UpdateHeroBody {
  page?: string
  title?: string
  mediaIds?: unknown
  /** 首頁專用的社群分享圖；null 代表清掉，改成自動用第一張 hero 圖 */
  ogMediaId?: unknown
}

const MAX = { title: 200, images: 8 } as const

export default defineEventHandler(async (event) => {
  const body = await readBody<UpdateHeroBody>(event)

  // 逐欄取值，不用 { ...body } 展開：那樣連 id、updatedAt 都會被呼叫端指定
  const page = typeof body.page === 'string' && isHeroPage(body.page) ? body.page : HERO_PAGES[0]

  // 圖片來自媒體庫，只收 id：呼叫端沒有機會塞任意網址進來，
  // 也就不需要以前那個 isSafeImageUrl() 的字串檢查了。
  const rawIds = Array.isArray(body.mediaIds) ? body.mediaIds : []
  const mediaIds = rawIds
    .map(v => Number(v))
    .filter(v => Number.isInteger(v) && v > 0)

  if (mediaIds.length > MAX.images) {
    throw createError({ statusCode: 400, statusMessage: `hero 圖片最多 ${MAX.images} 張` })
  }
  if (new Set(mediaIds).size !== mediaIds.length) {
    throw createError({ statusCode: 400, statusMessage: '同一張照片不能重複加入' })
  }

  const db = getDB(event)

  if (mediaIds.length) {
    const found = await db.select({ id: media.id }).from(media).where(inArray(media.id, mediaIds)).all()
    if (found.length !== mediaIds.length) {
      throw createError({ statusCode: 400, statusMessage: '有照片已不存在，請重新選擇' })
    }
  }

  if (page === 'home') {
    const title = typeof body.title === 'string' ? body.title.trim() : ''

    if (!title) throw createError({ statusCode: 400, statusMessage: '請填寫標題' })
    if (title.length > MAX.title) throw createError({ statusCode: 400, statusMessage: `標題請控制在 ${MAX.title} 字以內` })

    // 分享圖跟 hero 圖不同，不必是媒體庫裡「已掛在這一頁」的照片，但一定要真的存在，
    // 否則會存下一個 JOIN 不到的孤兒 id
    const rawOgId = Number(body.ogMediaId)
    const ogMediaId = Number.isInteger(rawOgId) && rawOgId > 0 ? rawOgId : null
    if (ogMediaId) {
      const exists = await db.select({ id: media.id }).from(media).where(eq(media.id, ogMediaId)).get()
      if (!exists) throw createError({ statusCode: 400, statusMessage: '分享圖已不存在，請重新上傳' })
    }

    const existing = await db.select().from(heroContent).get()
    if (!existing) {
      await db.insert(heroContent).values({ title, ogMediaId }).run()
    } else {
      await db.update(heroContent)
        .set({ title, ogMediaId, updatedAt: new Date().toISOString() })
        .where(eq(heroContent.id, existing.id))
        .run()
    }
  }

  // 只清掉這一頁的圖再依序寫回；刪除範圍一定要帶 page 條件，
  // 否則存首頁會把另外三頁的設定一起清掉。
  await db.delete(heroImages).where(eq(heroImages.page, page)).run()
  for (const [index, mediaId] of mediaIds.entries()) {
    await db.insert(heroImages).values({ page, mediaId, sortOrder: index }).run()
  }

  return { ok: true }
})
