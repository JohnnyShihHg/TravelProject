import sanitizeHtml from 'sanitize-html'

/**
 * 富文本內容的清洗規則。
 *
 * 為什麼一定要有這一層：行程內容是用 Tiptap 編輯、以 HTML 存進 content_blocks.data，
 * 前台再用 v-html 原樣渲染給所有訪客看（TripBlockRichText / TripBlockHighlights /
 * TripBlockDailyItinerary）。編輯器是前端控制項，直接打 API 就能繞過，所以
 * 「編輯器只會產生安全的 HTML」不能當成保證 —— 從外部網頁複製貼上也可能夾帶惡意標籤。
 *
 * 白名單刻意只涵蓋 Tiptap 這幾個擴充功能（StarterKit + Underline + TextAlign + Image）
 * 實際會產生的標籤，不多給。要新增編輯器功能時，這裡要同步放行對應標籤。
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'del', 'code', 'pre',
    'blockquote', 'ul', 'ol', 'li',
    'a', 'img', 'span'
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    // TextAlign 擴充是用 style="text-align: center" 表示對齊，
    // 底下的 allowedStyles 會再把 style 限縮到只剩 text-align
    p: ['style'],
    h1: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
    h5: ['style'],
    h6: ['style']
  },
  // 只允許這些協定，擋掉 javascript: 與 data: 開頭的網址
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // 相對路徑（例如站內圖片 /media/uploads/xxx.webp）要放行
  allowProtocolRelative: false,
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/]
    }
  },
  // 外連一律補上 noopener，避免被開啟的分頁透過 window.opener 操作原頁面
  transformTags: {
    a: (tagName, attribs) => {
      if (attribs.target === '_blank') {
        return { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }
      }
      return { tagName, attribs }
    }
  },
  // 不在白名單的標籤連同內容一起丟掉（預設只丟標籤、保留內文，
  // <script> 的程式碼會變成看得見的文字）
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed']
}

/** 清洗單一段 HTML。非字串一律回傳空字串，避免型別被繞過。 */
export function sanitizeRichText(html: unknown): string {
  if (typeof html !== 'string' || !html) return ''
  return sanitizeHtml(html, OPTIONS)
}

/**
 * 清洗一個內容區塊的 data。
 *
 * 只碰真正會被 v-html 吃掉的欄位（richtext/highlights 的 html、每日行程各天的 html），
 * 其餘欄位（航班代碼、飯店名稱…）都是用 {{ }} 插值渲染，Vue 會自動逃逸，不需要處理。
 */
export function sanitizeBlockData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data
  const value = data as Record<string, unknown>

  if (typeof value.html === 'string') {
    return { ...value, html: sanitizeRichText(value.html) }
  }

  if (Array.isArray(value.days)) {
    return {
      ...value,
      days: value.days.map(day =>
        day && typeof day === 'object' && typeof (day as Record<string, unknown>).html === 'string'
          ? { ...day, html: sanitizeRichText((day as Record<string, unknown>).html) }
          : day
      )
    }
  }

  return data
}
