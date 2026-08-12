import { eq } from 'drizzle-orm'
import { getDB } from '../../utils/db'
import { heroContent } from '../../database/schema'

interface UpdateHeroBody {
  title?: string
  subtitle?: string
  imageUrl?: string
}

const MAX = { title: 200, subtitle: 300, imageUrl: 2000 } as const

/**
 * imageUrl 會被塞進首頁 hero 的 <img src>。javascript: 在 img src 不會執行，
 * 但限制成「站內相對路徑或 http(s)」可以擋掉 data: 之類的意外用法，
 * 也避免打錯字時整個首頁變成空白。
 */
function isSafeImageUrl(url: string) {
  return url.startsWith('/') || /^https?:\/\//i.test(url)
}

export default defineEventHandler(async (event) => {
  const body = await readBody<UpdateHeroBody>(event)

  // 逐欄取值，不用 { ...body } 展開：那樣連 id、updatedAt 都會被呼叫端指定
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim() : ''
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''

  if (!title) throw createError({ statusCode: 400, statusMessage: '請填寫標題' })
  if (!imageUrl) throw createError({ statusCode: 400, statusMessage: '請選擇背景圖片' })
  if (title.length > MAX.title) throw createError({ statusCode: 400, statusMessage: `標題請控制在 ${MAX.title} 字以內` })
  if (subtitle.length > MAX.subtitle) throw createError({ statusCode: 400, statusMessage: `副標題請控制在 ${MAX.subtitle} 字以內` })
  if (imageUrl.length > MAX.imageUrl || !isSafeImageUrl(imageUrl)) {
    throw createError({ statusCode: 400, statusMessage: '圖片網址不正確' })
  }

  const values = { title, subtitle, imageUrl }

  const db = getDB(event)
  const existing = await db.select().from(heroContent).get()

  if (!existing) {
    return db.insert(heroContent).values(values).returning().get()
  }

  await db.update(heroContent)
    .set({ ...values, updatedAt: new Date().toISOString() })
    .where(eq(heroContent.id, existing.id))
    .run()
  return db.select().from(heroContent).where(eq(heroContent.id, existing.id)).get()
})
