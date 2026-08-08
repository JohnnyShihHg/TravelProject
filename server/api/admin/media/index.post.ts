import { db } from '../../../utils/db'
import { media } from '../../../database/schema'

interface CreateMediaBody {
  category?: string
  url?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateMediaBody>(event)
  const seed = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const url = body.url?.trim() || `https://picsum.photos/seed/${seed}/1200/800`

  // 本地開發階段沒有真的接 R2，先用假圖網址模擬上傳；正式部署時改成真的上傳到 R2 並存 r2_key
  return db.insert(media).values({
    r2Key: `media/${seed}.jpg`,
    url,
    category: body.category || null
  }).returning().get()
})
