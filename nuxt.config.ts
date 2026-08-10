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