// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxt/fonts',
    '@nuxt/eslint',
    'nuxt-security'
  ],

  css: ['~/assets/css/main.css'],

  ui: {
    colorMode: false
  },

  app: {
    head: {
      // 全站中文，宣告出來讓搜尋引擎與螢幕閱讀器知道
      htmlAttrs: { lang: 'zh-Hant-TW' }
    }
  },

  // 安全標頭，改用 nuxt-security 而不是手動 routeRules headers：
  // 這個模組支援 CSP 的 nonce 機制，每個 request 動態產生隨機值，讓 script-src 可以
  // 真正鎖成 'strict-dynamic' + nonce，不用再靠 'unsafe-inline' 放行所有 inline script。
  //
  // nuxt-security 預設還會啟用 CSRF / rate limiter / CORS handler / request size limiter
  // 等其他防護，這裡全部明確關掉：這個站的 admin API 目前是用 $fetch 直接打，沒有處理
  // CSRF token，貿然讓 CSRF 保護生效會直接打壞後台所有寫入操作。只要 CSP 與標頭這一塊。
  security: {
    headers: {
      contentSecurityPolicy: {
        'default-src': ['\'self\''],
        // 'unsafe-inline' 留著純粹是給不支援 nonce 的舊瀏覽器 fallback：CSP Level 3
        // 規格規定瀏覽器只要認得 nonce-source，就會忽略同一個指令裡的 'unsafe-inline'，
        // 兩者共存是官方文件建議的標準寫法，不是設定錯誤或安全漏洞。
        'script-src': ['\'self\'', '\'strict-dynamic\'', '\'nonce-{{nonce}}\'', '\'unsafe-inline\''],
        'style-src': ['\'self\'', '\'unsafe-inline\''],
        // 圖片來源含 R2（同網域）、picsum 假圖，換成真實照片後可再收緊成 'self'
        'img-src': ['\'self\'', 'data:', 'blob:', 'https:'],
        'font-src': ['\'self\'', 'data:'],
        'connect-src': ['\'self\''],
        'object-src': ['\'none\''],
        'base-uri': ['\'self\''],
        'form-action': ['\'self\''],
        'frame-ancestors': ['\'none\''],
        'upgrade-insecure-requests': true
      },
      // 預設偏嚴格會擋掉跨網域載入資源，這個站還在用外部的 picsum.photos 假圖
      // （TASK D2，等真實照片上線才會拿掉），也需要讓社群平台抓取 og:image 做預覽卡片
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: 'cross-origin',
      xContentTypeOptions: 'nosniff',
      xFrameOptions: 'DENY',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: []
      }
    },
    nonce: true,
    csrf: false,
    rateLimiter: false,
    corsHandler: false,
    requestSizeLimiter: false,
    xssValidator: false,
    allowedMethodsRestricter: false,
    basicAuth: false,
    sri: false,
    ssg: false
  },

  runtimeConfig: {
    telegramBotToken: '',
    telegramChatId: '',
    public: {
      // canonical、og:url、sitemap 都需要絕對網址。
      // 換自訂網域時設環境變數 NUXT_PUBLIC_SITE_URL 即可，不用改程式。
      siteUrl: 'https://wuqiong-travel.nadia861130.workers.dev'
    }
  }

  // Cloudflare preset (nitro.preset: 'cloudflare_module') is intentionally NOT set here.
  // Setting it globally also makes `nuxt dev` run under Cloudflare's dev emulation, which
  // can't load native modules like better-sqlite3 — breaking local dev. The preset is
  // applied only at actual deploy-build time via the NITRO_PRESET env var (see package.json
  // "deploy" script), never for everyday `nuxt dev` / `nuxt build`.
})