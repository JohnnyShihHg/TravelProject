import type { H3Event } from 'h3'
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { R2Bucket, ImagesBinding } from '@cloudflare/workers-types'

interface CloudflareMediaEnv {
  bucket: R2Bucket
  images: ImagesBinding
}

export function getCloudflareMediaEnv(event: H3Event): CloudflareMediaEnv | null {
  const env = (event as unknown as { context?: { cloudflare?: { env?: { MEDIA?: R2Bucket, IMAGES?: ImagesBinding } } } })?.context?.cloudflare?.env
  if (env?.MEDIA && env?.IMAGES) return { bucket: env.MEDIA, images: env.IMAGES }
  return null
}

const LOCAL_UPLOAD_DIR = '.data'

function randomKey(ext: string) {
  return `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
}

const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

/**
 * 單張圖片上限。
 *
 * 這個數字不是憑感覺訂的：Worker 讀取 multipart 請求時會把整個內容載進記憶體，
 * 實測 5MB 可以正常處理、8MB 就會觸發資源超限（Cloudflare 錯誤 1102）。
 * 訂在 5MB 是留在確定安全的一側。
 *
 * 正常情況不會碰到這個上限 —— 前台上傳前會先在瀏覽器把圖縮到 1600px
 * （app/utils/image-upload.ts），縮完通常只有數百 KB。這個上限是給
 * 「瀏覽器縮圖失敗而原樣送出」或直接打 API 的情況兜底用的。
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/**
 * 用檔案開頭的識別位元組判斷真正的格式。
 *
 * multipart 的 Content-Type 是呼叫端自己填的，改成 image/png 送任何東西都會通過，
 * 所以不能只看它。這裡比對實際內容，非圖片一律擋掉。
 */
export function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'image/png'
  // GIF: GIF87a / GIF89a
  if (buffer.subarray(0, 6).toString('latin1').match(/^GIF8[79]a$/)) return 'image/gif'
  // WEBP: RIFF....WEBP
  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp'
  }
  return null
}

// 上傳並壓縮圖片：Cloudflare 環境用 Images binding 縮圖+轉 webp 後存進 R2；
// 本機開發沒有 R2/Images binding 可用，直接把原始檔案存到本機磁碟，不壓縮
// （本機只是給開發者預覽用，真正會被使用者看到的是部署後 R2 版本）。
export async function storeUploadedImage(event: H3Event, fileBuffer: Buffer, contentType: string): Promise<{ key: string, url: string }> {
  const cf = getCloudflareMediaEnv(event)

  if (cf) {
    const key = randomKey('webp')
    // DOM lib's ReadableStream and @cloudflare/workers-types' ReadableStream are structurally
    // incompatible type declarations for the same runtime object; cast to unblock TS here.
    const inputStream = new Response(new Uint8Array(fileBuffer)).body as unknown as Parameters<ImagesBinding['input']>[0]
    const processed = (
      await cf.images.input(inputStream)
        .transform({ width: 1600 })
        .output({ format: 'image/webp', quality: 75 })
    ).response()

    // 先讀成 ArrayBuffer 再交給 R2，不要直接傳 processed.body：
    // R2 的 put() 要求串流必須有已知長度，而 Images 輸出的串流沒有 Content-Length。
    // 正式環境剛好可以運作，但本機 wrangler dev 的模擬會直接丟
    // 「Provided readable stream must have a known length」——
    // 等於上傳功能在本機完全無法測試，也代表正式環境是依賴一個沒寫明的行為。
    // 圖片已限制在 5MB 內、且轉檔後通常只有幾百 KB，整個讀進記憶體沒有負擔。
    const processedBytes = await processed.arrayBuffer()
    await cf.bucket.put(key, processedBytes, {
      httpMetadata: { contentType: 'image/webp' }
    })
    return { key, url: `/media/${key}` }
  }

  const key = randomKey(CONTENT_TYPE_EXT[contentType] ?? 'jpg')
  const localPath = join(LOCAL_UPLOAD_DIR, key)
  mkdirSync(dirname(localPath), { recursive: true })
  writeFileSync(localPath, fileBuffer)
  return { key, url: `/media/${key}` }
}

const EXT_CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
}

/**
 * 刪掉實際的檔案。刻意做成「盡力而為」：呼叫端已經先刪掉資料庫紀錄，
 * 就算這裡失敗也只是 R2／磁碟上多一個孤兒檔案，不該讓整個刪除動作失敗。
 */
export async function deleteStoredImage(event: H3Event, key: string): Promise<void> {
  const cf = getCloudflareMediaEnv(event)
  try {
    if (cf) {
      await cf.bucket.delete(key)
      return
    }
    const localPath = join(LOCAL_UPLOAD_DIR, key)
    if (existsSync(localPath)) unlinkSync(localPath)
  } catch (err) {
    console.warn(`[media] 刪除檔案失敗，留下孤兒檔案 ${key}:`, err)
  }
}

export async function readLocalUpload(key: string): Promise<{ data: Buffer, contentType: string } | null> {
  const localPath = join(LOCAL_UPLOAD_DIR, key)
  if (!existsSync(localPath)) return null
  const ext = localPath.split('.').pop()?.toLowerCase() ?? ''
  const contentType = EXT_CONTENT_TYPE[ext] ?? 'application/octet-stream'
  return { data: readFileSync(localPath), contentType }
}
