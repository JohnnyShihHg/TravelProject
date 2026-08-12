import { eq } from 'drizzle-orm'
import { getDB } from '../utils/db'
import { contactSubmissions, trips } from '../database/schema'

interface ContactBody {
  name?: string
  phone?: string
  email?: string
  interestedTripId?: number
  message?: string
}

// 這支 API 是設計上永久公開的（Cloudflare Access 只會擋 /admin 與 /api/admin），
// 所以長度上限一定要在這裡擋：沒有上限的話，一個腳本就能把 D1 容量與帳單灌爆。
// 上限抓得比正常填寫寬鬆很多，正常使用者不會碰到。
const LIMITS = { name: 100, phone: 50, email: 254, message: 2000 } as const

function tooLong(value: string | null, max: number) {
  return value !== null && value.length > max
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ContactBody>(event)

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() || null : null
  const email = typeof body.email === 'string' ? body.email.trim() || null : null
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!name) throw createError({ statusCode: 400, statusMessage: '請填寫姓名' })
  if (!message) throw createError({ statusCode: 400, statusMessage: '請填寫留言內容' })
  if (!phone && !email) throw createError({ statusCode: 400, statusMessage: '請至少填寫電話或 Email 其中一種聯絡方式' })

  if (name.length > LIMITS.name) throw createError({ statusCode: 400, statusMessage: `姓名請控制在 ${LIMITS.name} 字以內` })
  if (message.length > LIMITS.message) throw createError({ statusCode: 400, statusMessage: `留言內容請控制在 ${LIMITS.message} 字以內` })
  if (tooLong(phone, LIMITS.phone)) throw createError({ statusCode: 400, statusMessage: '電話格式不正確' })
  if (tooLong(email, LIMITS.email)) throw createError({ statusCode: 400, statusMessage: 'Email 格式不正確' })
  // 只做最基本的形狀檢查，不用嚴格 regex —— 擋掉明顯亂填的即可，
  // 真正的驗證是客服回信時才知道
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email 格式不正確' })
  }

  const db = getDB(event)

  // 型別註記在執行期會被抹掉，送進來的可能是字串或物件；
  // 沒驗證的話會一路帶到 DB 層變成 500。查不到就當作沒填。
  let interestedTripId: number | null = null
  if (Number.isInteger(body.interestedTripId) && (body.interestedTripId as number) > 0) {
    const found = await db.select({ id: trips.id }).from(trips)
      .where(eq(trips.id, body.interestedTripId as number)).get()
    interestedTripId = found?.id ?? null
  }

  const submission = await db.insert(contactSubmissions).values({
    name,
    phone,
    email,
    interestedTripId,
    message
  }).returning().get()

  // Telegram 通知：本地開發階段沒設定就不送，正式部署到 Cloudflare 時設定 runtimeConfig 即可
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
    // 刻意只記 id，不要把姓名／電話／Email／留言內容寫進 log ——
    // Cloudflare 的 Workers logs 不是設計來存放客戶個資的地方
    console.log(`[contact] 收到新表單 #${submission.id}（未設定 Telegram，略過通知）`)
  }

  return { ok: true, id: submission.id }
})
