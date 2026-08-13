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
