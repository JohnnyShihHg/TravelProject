/**
 * 響應式圖片可用的寬度。前後台與伺服器端必須用同一份定義，所以放在 shared/：
 * 前端組出來的 `?w=` 只要不在這份白名單裡，伺服器就會忽略它並送回原圖（等於全站失去響應式），
 * 而這種退化不會有任何錯誤訊息，兩邊各留一份常數遲早會漂移。
 *
 * 原檔（長邊縮進 1600px，見 server/utils/media.ts）維持在沒有參數的網址上，不列在這裡。
 */
export const DERIVATIVE_WIDTHS = [400, 800, 1200] as const

export type DerivativeWidth = typeof DERIVATIVE_WIDTHS[number]

export function isDerivativeWidth(value: number): value is DerivativeWidth {
  return (DERIVATIVE_WIDTHS as readonly number[]).includes(value)
}

/**
 * 社群分享卡（og:image）的尺寸。1200×630 是 Facebook 建議值，比例 1.91:1，
 * LINE、Twitter/X、LinkedIn 也都吃這個比例。
 *
 * 為什麼一定要裁：平台拿到不是 1.91:1 的圖會自己裁，裁哪一塊不可控 ——
 * 直式照片最慘，常常只剩中間一條。與其讓平台亂裁，不如我們先裁好。
 *
 * 後台手動指定的分享圖是在瀏覽器裡拉框裁好才上傳的（ImageCropDialog），
 * 這個尺寸是給「沒有手動指定、自動拿該頁現有照片」的情況用的。
 */
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630
export const OG_ASPECT_RATIO = OG_IMAGE_WIDTH / OG_IMAGE_HEIGHT

/** 加在媒體網址後面，讓伺服器輸出裁成 1200×630 的版本 */
export function toOgImageUrl(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}og=1`
}
