// 手寫而非用模組：規則只有幾條，裝一個模組換來的設定面比程式碼本身還多。
export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl.replace(/\/$/, '')

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  // 後台在補上 Cloudflare Access 之前完全沒有驗證，一定要擋。
  // /api/ 沒有給人看的內容，收錄也沒有意義。
  return [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    ''
  ].join('\n')
})
