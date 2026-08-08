# 無穹旅行社官網

Nuxt 4 官網專案。目前為本地開發階段，資料庫用本地 SQLite（尚未串接 Cloudflare Worker/D1/R2），詳見 `PLANNING_NOTES.md`。

## 開發環境

```bash
npm install
npm run dev
```

啟動後預設在 `http://localhost:3000`（若該埠被佔用會自動改用其他埠，請看終端機輸出的網址）。

首次啟動會自動建立本地 SQLite 資料庫（`.data/dev.sqlite`，已加入 `.gitignore`）並塞入假資料（行程、梯次、標籤、媒體庫、聯絡表單範例）。若要重新產生一份乾淨的假資料，刪除 `.data/` 後重新啟動即可。

## 目錄結構

- `app/pages`：前台頁面（首頁、出團資訊、行程詳情、關於無穹、聯絡我們）與 `app/pages/admin`（後台）
- `app/layouts`：`default`（前台，含 Header/Footer）與 `admin`（後台）
- `server/database/schema.ts`：資料表定義（drizzle-orm，之後要遷移到 Cloudflare D1 時可沿用同一份 schema）
- `server/database/seed.ts`：本地開發用假資料
- `server/api`：公開 API（`/api/trips`、`/api/batches`、`/api/contact` 等）與後台 API（`/api/admin/*`）

## 後台

本地開發階段 `/admin` **沒有任何登入驗證**，正式部署到 Cloudflare 前務必依照 `PLANNING_NOTES.md` 的規劃套上 Cloudflare Zero Trust（Access）保護。

## 檢查

```bash
npx eslint .
npx nuxt typecheck
```
