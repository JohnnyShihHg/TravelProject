/**
 * 把名稱轉成適合放進網址的 slug。
 *
 * 這個站的內容大多是中文（京都、清水寺、賞楓…），而中文字沒有通用的音譯規則，
 * 硬轉會需要額外的拼音套件，對這個規模的專案是過度設計。所以策略是：
 * 能轉的（英數字）就轉，全中文的名稱回傳空字串，交給呼叫端決定 fallback。
 *
 * 正式上線會被 SEO 用到的 slug（國家、城市、景點）都由人工指定，
 * 不依賴這支函式自動產生的結果。
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // 去掉附加符號（é -> e）
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** slugify 轉不出東西時（全中文名稱）的替代方案，之後可在後台手動改成有意義的 slug */
export function fallbackSlug(prefix = 'item'): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

/**
 * 確保 slug 沒被用掉，撞到就加序號。
 * exists 由呼叫端提供，因為每張表要查的欄位不同。
 */
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  let candidate = base
  for (let i = 2; ; i++) {
    if (!(await exists(candidate))) return candidate
    candidate = `${base}-${i}`
  }
}
