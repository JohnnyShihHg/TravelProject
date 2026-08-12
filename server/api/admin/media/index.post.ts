import { getDB } from '../../../utils/db'
import { media } from '../../../database/schema'
import { storeUploadedImage, sniffImageType, MAX_UPLOAD_BYTES } from '../../../utils/media'
import { setMediaLinks } from '../../../utils/media-links'

export default defineEventHandler(async (event) => {
  // 大小檢查一定要在 readMultipartFormData 之前：它會把整個請求體載進 Worker 記憶體，
  // 實測超過約 8MB 就會直接觸發資源超限（Cloudflare 錯誤 1102），
  // 那時候程式根本還沒執行到下面的檢查，使用者只會看到 Cloudflare 的錯誤頁。
  const declaredSize = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (declaredSize > MAX_UPLOAD_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: `圖片檔案過大（${(declaredSize / 1024 / 1024).toFixed(1)}MB），請控制在 ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB 以內`
    })
  }

  const form = await readMultipartFormData(event)
  const filePart = form?.find(p => p.name === 'file' && p.data?.length)

  if (!filePart) throw createError({ statusCode: 400, statusMessage: '請選擇要上傳的圖片檔案' })
  // 沒有 content-length 或被低報時的第二道防線
  if (filePart.data.length > MAX_UPLOAD_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: `圖片檔案不能超過 ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB`
    })
  }

  // 比對實際檔案內容而不是 multipart 的 Content-Type —— 後者是呼叫端自己填的，可任意偽造
  const actualType = sniffImageType(filePart.data)
  if (!actualType) throw createError({ statusCode: 400, statusMessage: '只能上傳圖片檔案（JPEG／PNG／GIF／WebP／HEIC）' })

  // 上傳時可直接帶上要掛的地點／景點（逗號分隔的 id），之後也能在媒體庫再調整
  const idList = (name: string) => {
    const raw = form?.find(p => p.name === name)?.data.toString('utf-8') ?? ''
    return raw.split(',').map(s => Number(s.trim())).filter(n => Number.isInteger(n) && n > 0)
  }
  const destinationIds = idList('destinationIds')
  const spotIds = idList('spotIds')

  const { key, url } = await storeUploadedImage(event, filePart.data, actualType)

  const db = getDB(event)
  const row = await db.insert(media).values({ r2Key: key, url }).returning().get()

  if (destinationIds.length || spotIds.length) {
    const linked = await setMediaLinks(db, row.id, { destinationIds, spotIds })
    if (linked) return linked
  }
  return { ...row, destinations: [], spots: [] }
})
