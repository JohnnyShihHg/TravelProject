// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxt/fonts',
    '@nuxt/eslint'
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

  // 安全標頭。放在 routeRules 而不是 public/_headers：_headers 只作用在
  // Cloudflare 直接吐出的靜態檔案，SSR 出來的 HTML 是 Worker 產生的，吃不到。
  routeRules: {
    '/**': {
      headers: {
        // script-src 不得不放行 inline：Nuxt 4 會輸出 importmap 與 hydration 用的
        // inline script，改成嚴格模式整站會直接壞掉。要真正鎖起來需要導入
        // nonce 機制（nuxt-security 模組），成本較高、之後可再評估。
        // 即使 script 放寬，下面這幾條在 XSS 發生時仍然擋得住實際危害：
        //   object-src  擋外掛型執行
        //   base-uri    擋 <base> 劫持所有相對路徑
        //   form-action 擋注入的表單把資料送去外部網域
        //   frame-ancestors 擋點擊劫持
        'content-security-policy': [
          'default-src \'self\'',
          'script-src \'self\' \'unsafe-inline\'',
          'style-src \'self\' \'unsafe-inline\'',
          // 圖片來源含 R2（同網域）、picsum 假圖，換成真實照片後可再收緊成 'self'
          'img-src \'self\' data: blob: https:',
          'font-src \'self\' data:',
          'connect-src \'self\'',
          'object-src \'none\'',
          'base-uri \'self\'',
          'form-action \'self\'',
          'frame-ancestors \'none\'',
          'upgrade-insecure-requests'
        ].join('; '),
        // /media/ 直接回傳使用者上傳的檔案，一定要禁止瀏覽器自行猜測型別
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'strict-origin-when-cross-origin',
        // 這個站不需要這些裝置權限，一律關掉
        'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()'
      }
    }
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