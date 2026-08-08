import { ensureSchema, isCloudflareWorker } from '../utils/db'
import { seed } from '../database/seed'

export default defineNitroPlugin(async () => {
  // 部署到 Cloudflare Worker 時一定有 D1，schema 由 wrangler d1 execute 事先套用，
  // 這裡的本機 SQLite 初始化完全不會執行到。
  if (isCloudflareWorker()) return

  ensureSchema()
  await seed()
})
