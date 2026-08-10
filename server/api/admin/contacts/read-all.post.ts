import { eq } from 'drizzle-orm'
import { getDB } from '../../../utils/db'
import { contactSubmissions } from '../../../database/schema'

// 全部標記已讀。刻意做成需要手動按的動作，而不是進頁面就自動清空 ——
// 一進去就歸零的話，未讀數量對「還沒處理完就離開」的情況就失去意義了。
export default defineEventHandler(async (event) => {
  const db = getDB(event)
  await db.update(contactSubmissions)
    .set({ isRead: true })
    .where(eq(contactSubmissions.isRead, false))
    .run()
  return { ok: true }
})
