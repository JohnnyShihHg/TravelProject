import type { H3Event } from 'h3'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
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

    await cf.bucket.put(key, processed.body, {
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

export async function readLocalUpload(key: string): Promise<{ data: Buffer, contentType: string } | null> {
  const localPath = join(LOCAL_UPLOAD_DIR, key)
  if (!existsSync(localPath)) return null
  const ext = localPath.split('.').pop()?.toLowerCase() ?? ''
  const contentType = EXT_CONTENT_TYPE[ext] ?? 'application/octet-stream'
  return { data: readFileSync(localPath), contentType }
}
