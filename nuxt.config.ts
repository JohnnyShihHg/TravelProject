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

  runtimeConfig: {
    telegramBotToken: '',
    telegramChatId: ''
  }

  // Cloudflare preset (nitro.preset: 'cloudflare_module') is intentionally NOT set here.
  // Setting it globally also makes `nuxt dev` run under Cloudflare's dev emulation, which
  // can't load native modules like better-sqlite3 — breaking local dev. The preset is
  // applied only at actual deploy-build time via the NITRO_PRESET env var (see package.json
  // "deploy" script), never for everyday `nuxt dev` / `nuxt build`.
})