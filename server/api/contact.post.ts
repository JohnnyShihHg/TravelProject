import { getDB } from '../utils/db'
import { contactSubmissions } from '../database/schema'

interface ContactBody {
  name?: string
  phone?: string
  email?: string
  interestedTripId?: number
  message?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ContactBody>(event)

  const name = body.name?.trim()
  const phone = body.phone?.trim() || null
  const email = body.email?.trim() || null
  const message = body.message?.trim()
  const interestedTripId = body.interestedTripId ?? null

  if (!name) throw createError({ statusCode: 400, statusMessage: '請填寫姓名' })
  if (!message) throw createError({ statusCode: 400, statusMessage: '請填寫留言內容' })
  if (!phone && !email) throw createError({ statusCode: 400, statusMessage: '請至少填寫電話或 Email 其中一種聯絡方式' })

  const db = getDB(event)
  const submission = await db.insert(contactSubmissions).values({
    name,
    phone,
    email,
    interestedTripId,
    message
  }).returning().get()

  // Telegram 通知：本地開發階段先 log 出來，正式部署到 Cloudflare 時改接 Telegram Bot API
  const config = useRuntimeConfig()
  if (config.telegramBotToken && config.telegramChatId) {
    await $fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: config.telegramChatId,
        text: `新的聯絡表單來自 ${name}\n電話：${phone ?? '未填'}\nEmail：${email ?? '未填'}\n訊息：${message}`
      }
    }).catch(() => {})
  } else {
    console.log('[contact] 收到新表單（未設定 Telegram，僅記錄本地）:', submission)
  }

  return { ok: true, id: submission.id }
})
