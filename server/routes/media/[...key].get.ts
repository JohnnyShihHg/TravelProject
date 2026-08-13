import { getCloudflareMediaEnv, getOrCreateDerivative, getOrCreateOgDerivative, readLocalUpload } from '../../utils/media'
import { isDerivativeWidth } from '#shared/utils/image-sizes'

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key')
  if (!key) throw createError({ statusCode: 400, statusMessage: 'Missing key' })

  const query = getQuery(event)

  // ?w= 只接受白名單寬度（見 DERIVATIVE_WIDTHS 的說明）；其他值一律當作沒帶參數送原圖，
  // 不要回錯誤 —— 網址打錯時破圖比拿到大一點的圖糟糕得多。
  const requestedWidth = Number(query.w)
  const width = Number.isFinite(requestedWidth) && isDerivativeWidth(requestedWidth) ? requestedWidth : null

  // ?og=1 輸出裁成 1200×630 的社群分享圖。跟 ?w= 互斥，og 優先 ——
  // 分享卡要的是固定比例，同時帶寬度沒有意義。
  const wantsOg = query.og === '1' || query.og === 'true'

  const cf = getCloudflareMediaEnv(event)

  if (cf) {
    if (wantsOg) {
      const og = await getOrCreateOgDerivative(cf, key)
      if (og) {
        setResponseHeader(event, 'content-type', 'image/webp')
        setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
        return new Uint8Array(og)
      }
      // 裁切失敗就往下走，退回原圖 —— 分享卡有圖比沒圖好
    }

    if (width) {
      const derivative = await getOrCreateDerivative(cf, key, width)
      if (derivative) {
        setResponseHeader(event, 'content-type', 'image/webp')
        setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
        return new Uint8Array(derivative)
      }
      // 轉換失敗就往下走，退回原圖
    }

    const object = await cf.bucket.get(key)
    if (!object) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    setResponseHeader(event, 'content-type', object.httpMetadata?.contentType || 'application/octet-stream')
    setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
    return object.body
  }

  // 本機沒有 Images binding 可以縮圖，忽略 ?w= 與 ?og= 直接送原檔（本機只是給開發者預覽）
  const local = await readLocalUpload(key)
  if (!local) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  setResponseHeader(event, 'content-type', local.contentType)
  setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  return local.data
})
