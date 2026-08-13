<script setup lang="ts">
/**
 * 圖片薄包裝：只負責替媒體庫的圖片產生 srcset。
 *
 * 為什麼不是 <NuxtImg>：@nuxt/image 預設的 IPX provider 需要 sharp 與檔案系統，
 * 在 cloudflare_module preset 下不能執行。我們的縮圖是伺服器端 /media/<key>?w= 產生的
 * （server/routes/media/[...key].get.ts），所以只需要把網址組出來，不需要整個模組。
 *
 * 用法：
 * - 版面會隨螢幕變寬的圖 → 給 sizes，會產生完整 srcset 讓瀏覽器自己挑
 * - 尺寸固定的小圖（後台縮圖）→ 給 width，直接鎖定一個縮圖尺寸
 * - 外部網址（非 /media/ 開頭）→ 原樣輸出，行為不變
 *
 * class / loading / decoding / fetchpriority 等屬性靠 attrs 透傳，不必逐一宣告。
 */
import { DERIVATIVE_WIDTHS, type DerivativeWidth } from '#shared/utils/image-sizes'

const props = defineProps<{
  src: string
  alt?: string
  /** 響應式用：CSS 上這張圖實際會顯示多寬，例如 "100vw" 或 "(min-width: 1024px) 25vw, 100vw" */
  sizes?: string
  /** 固定尺寸用：直接鎖定一個縮圖寬度，不產生 srcset */
  width?: DerivativeWidth
}>()

const isManagedMedia = computed(() => props.src?.startsWith('/media/'))

const resolvedSrc = computed(() => {
  if (isManagedMedia.value && props.width) return `${props.src}?w=${props.width}`
  return props.src
})

const srcset = computed(() => {
  if (!isManagedMedia.value || !props.sizes) return undefined
  // 最後一項是原檔。媒體庫的圖長邊一律縮進 1600px（server/utils/media.ts），
  // 但表上沒有存實際寬高，所以這裡一律標 1600w —— 原圖比 1600 窄時瀏覽器可能會多抓一階，
  // 代價遠小於為此多加兩個欄位並回填既有照片。
  return [
    ...DERIVATIVE_WIDTHS.map(w => `${props.src}?w=${w} ${w}w`),
    `${props.src} 1600w`
  ].join(', ')
})
</script>

<template>
  <img
    :src="resolvedSrc"
    :srcset="srcset"
    :sizes="srcset ? sizes : undefined"
    :alt="alt ?? ''"
  >
</template>
