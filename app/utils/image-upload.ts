/**
 * 上傳前先在瀏覽器把照片縮小。
 *
 * 為什麼一定要做：Cloudflare Worker 讀取 multipart 請求時會把整個檔案載進記憶體，
 * 實測超過約 8MB 就會觸發 Worker 資源超限（錯誤 1102，使用者看到的是 Cloudflare 的
 * 錯誤頁而不是我們的訊息）。手機拍的照片動輒 3-12MB，正好踩在這條線上。
 *
 * 而且伺服器端本來就會把圖縮到最大寬 1600px 並轉成 webp（server/utils/media.ts），
 * 傳原始的 8MB 檔案上去，最後存的還是同一張縮圖 —— 純粹浪費頻寬與 Worker 資源。
 * 在瀏覽器先縮好再送，上傳通常會從數 MB 降到數百 KB。
 */

/** 跟伺服器端 transform({ width: 1600 }) 一致，縮完剛好不用再縮 */
const MAX_WIDTH = 1600

/** 小於這個大小且尺寸本來就不大的檔案直接原樣送，不要多做一次有損重壓 */
const SKIP_RESIZE_BYTES = 1024 * 1024

export interface ResizeResult {
  file: File | Blob
  originalBytes: number
  finalBytes: number
  resized: boolean
}

export async function resizeImageForUpload(file: File): Promise<ResizeResult> {
  const original = { originalBytes: file.size, finalBytes: file.size, resized: false }

  // GIF 可能是動畫，畫到 canvas 會只剩第一格，直接原樣送
  if (file.type === 'image/gif') return { file, ...original }

  // HEIC/HEIF 是 iPhone 相機的預設格式。沒有瀏覽器能在 canvas/createImageBitmap 解碼它
  // （Safari 靠 macOS/iOS 原生解碼器整個繞過這層，Chrome/Edge/Firefox 完全不支援）。
  // 下面的 try/catch 失敗也會 fallback 到原檔，這裡提早判斷純粹是不要浪費一次注定失敗
  // 的非同步解碼。原檔會被伺服器端的 Cloudflare Images 解碼（它原生支援 HEIC 輸入）。
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
    || /\.hei[cf]$/i.test(file.name)
  if (isHeic) return { file, ...original }

  let bitmap: ImageBitmap
  try {
    // imageOrientation: 'from-image' 會套用 EXIF 的旋轉資訊 ——
    // 手機直拍的照片沒有它會變成躺著的
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // 瀏覽器解不開就原樣送，讓伺服器端的格式檢查去處理
    return { file, ...original }
  }

  try {
    if (file.size <= SKIP_RESIZE_BYTES && bitmap.width <= MAX_WIDTH) {
      return { file, ...original }
    }

    const scale = Math.min(1, MAX_WIDTH / bitmap.width)
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return { file, ...original }
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/webp', 0.85)
    )
    // 轉不出來，或反而變大（極少數已高度壓縮的圖）就用原檔
    if (!blob || blob.size >= file.size) return { file, ...original }

    return {
      file: new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }),
      originalBytes: file.size,
      finalBytes: blob.size,
      resized: true
    }
  } finally {
    bitmap.close()
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
