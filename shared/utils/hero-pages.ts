/**
 * 有 hero 輪播圖的頁面。前台四個頁面、後台編輯器與 API 驗證共用這份清單，
 * 放 shared/ 是因為 `page` 是寫進資料庫的字串鍵：前後端各留一份遲早會漂移，
 * 而漂移的症狀是「後台存了圖但前台永遠讀不到」，沒有任何錯誤訊息。
 */
export const HERO_PAGES = ['home', 'trips', 'about', 'contact'] as const

export type HeroPage = typeof HERO_PAGES[number]

export const HERO_PAGE_LABELS: Record<HeroPage, string> = {
  home: '首頁',
  trips: '行程列表',
  about: '關於我們',
  contact: '聯絡我們'
}

export function isHeroPage(value: string): value is HeroPage {
  return (HERO_PAGES as readonly string[]).includes(value)
}
