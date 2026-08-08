import { getDB } from '../../../utils/db'
import { media } from '../../../database/schema'
import { storeUploadedImage } from '../../../utils/media'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  const filePart = form?.find(p => p.name === 'file' && p.data?.length)
  const categoryPart = form?.find(p => p.name === 'category')

  if (!filePart) throw createError({ statusCode: 400, statusMessage: '請選擇要上傳的圖片檔案' })
  if (!filePart.type?.startsWith('image/')) throw createError({ statusCode: 400, statusMessage: '只能上傳圖片檔案' })

  const category = categoryPart?.data.toString('utf-8') || null
  const { key, url } = await storeUploadedImage(event, filePart.data, filePart.type)

  const db = getDB(event)
  return db.insert(media).values({
    r2Key: key,
    url,
    category
  }).returning().get()
})
