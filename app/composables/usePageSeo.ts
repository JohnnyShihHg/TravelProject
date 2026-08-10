interface PageSeoOptions {
  /** 頁面標題。會自動接上品牌名，除非 appendBrand: false */
  title: string
  description?: string | null
  /** 社群分享用圖片（相對路徑會自動補成絕對網址） */
  image?: string | null
  /** 這一頁的正規網址路徑，例如 /trips/kyoto-autumn-6days */
  path: string
  /** og:type，行程頁用 article，其餘用 website */
  type?: 'website' | 'article'
  appendBrand?: boolean
  noindex?: boolean
}

const BRAND = '無穹旅行社'
/** Google 搜尋結果的描述大約 155 字元後會被截斷 */
const DESCRIPTION_MAX = 155

export type AbsoluteUrl = (path: string) => string

function makeAbsoluteUrl(siteUrl: string): AbsoluteUrl {
  const base = siteUrl.replace(/\/$/, '')
  return (path: string) => {
    if (!path) return base
    if (/^https?:\/\//.test(path)) return path
    return `${base}${path.startsWith('/') ? path : `/${path}`}`
  }
}

/**
 * 取得把相對路徑補成絕對網址的函式。
 *
 * 回傳的是「純函式」而不是直接提供 absoluteUrl()：因為 useRuntimeConfig() 需要
 * Nuxt instance，只能在 setup 當下呼叫。JSON-LD 的內容是放在 computed 裡、
 * 到 head 解析階段才求值，那時已經離開 setup 上下文，直接呼叫會炸掉。
 * 所以這裡在 setup 就把 siteUrl 取出來閉包起來。
 */
export function useAbsoluteUrl(): AbsoluteUrl {
  return makeAbsoluteUrl(useRuntimeConfig().public.siteUrl)
}

/** 去掉 HTML 標籤與多餘空白，並截到搜尋結果會顯示的長度 */
export function toMetaDescription(input?: string | null, max = DESCRIPTION_MAX) {
  if (!input) return ''
  const text = input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

/**
 * 統一設定一頁的 meta。
 *
 * 設計原則：編輯者不填 SEO 欄位也要有正確的 meta，所以呼叫端傳進來的
 * title/description 已經是「自訂值 ?? 自動推導值」的結果。
 * canonical 與 og:url 一律由程式產生，不開放後台編輯。
 */
export function usePageSeo(options: PageSeoOptions) {
  const abs = useAbsoluteUrl()
  const title = options.appendBrand === false ? options.title : `${options.title}｜${BRAND}`
  const description = toMetaDescription(options.description)
  const url = abs(options.path)
  const image = options.image ? abs(options.image) : undefined

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: url,
    ogType: options.type ?? 'website',
    ogSiteName: BRAND,
    ogLocale: 'zh_TW',
    ogImage: image,
    // 有圖用大圖卡，沒圖就用純文字卡，避免出現破圖
    twitterCard: image ? 'summary_large_image' : 'summary',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
    robots: options.noindex ? 'noindex, nofollow' : 'index, follow'
  })

  useHead({
    link: [{ rel: 'canonical', href: url }]
  })
}

/**
 * 把物件塞成 JSON-LD script，Google 用它理解頁面的結構化資訊。
 *
 * build 會收到一個 abs 函式來組絕對網址 —— 不要在 build 裡自己呼叫需要
 * Nuxt instance 的 composable，這段程式碼是到 head 解析時才執行的。
 */
export function useJsonLd(build: (abs: AbsoluteUrl) => Record<string, unknown> | null) {
  const abs = useAbsoluteUrl()
  useHead({
    script: computed(() => {
      const value = build(abs)
      if (!value) return []
      return [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({ '@context': 'https://schema.org', ...value })
      }]
    })
  })
}
