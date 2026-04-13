# 📅 預約管理系統 (Reservation System)

這是一個基於 **Next.js 15+**、**Supabase** 與 **LINE LIFF** 構建的現代化預約管理系統。專為提供無縫的行動端預約體驗及強大的後台管理功能而設計。

## 🚀 核心功能

- **📱 LINE LIFF 整合**：整合 LINE 登入與 LIFF 介面，讓使用者直接在 LINE 內部完成預約。
- **📅 預約預測與管理**：直觀的預約介面，支援即時查看時段與狀態。
- **🗓️ Google Apps Script 與日曆整合**：透過 GAS 橋接，讓預約自動同步至日曆或文件。
- **🔐 多重角色權限**：
  - **使用者**：瀏覽預約、填寫資料、記錄追蹤。
  - **管理者 (Admin)**：管理該場域的預約時段、審核狀態。
  - **超級管理員 (Super Admin)**：系統全域設定、跨場域管理、API 金鑰維護。
- **🔔 即時通知**：整合 LINE Notify 或 Edge Functions 進行預約狀態提醒與審核通知。
- **⚡ 效能極速**：部署於 Cloudflare Pages，結合 Next.js App Router 提供極佳的響應速度。

## 🛠️ 技術棧

- **框架**: [Next.js](https://nextjs.org/) (App Router)
- **語言**: [TypeScript](https://www.typescriptlang.org/)
- **樣式**: [Tailwind CSS 4+](https://tailwindcss.com/)
- **資料庫/認證**: [Supabase](https://supabase.com/)
- **整合**: [LINE LIFF SDK](https://developers.line.biz/zh-hant/docs/liff/)
- **部署**: [Cloudflare Pages](https://pages.cloudflare.com/) (`next-on-pages`)

## 📦 快速開始

### 1. 複製專案與安裝依賴

```bash
git clone <repository-url>
cd client-nextjs
npm install
```

### 2. 環境變數設定

複製 `env_sample.local` 為 `.env.local` 並填入對應的 API 金鑰：

```bash
cp env_sample.local .env.local
```

主要變數包含：
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
- `SUPABASE_SERVICE_ROLE_K`: Supabase 匿名金鑰
- `NEXT_PUBLIC_LIFF_ID`: LINE LIFF ID
- `NEXT_PUBLIC_GAS_URL`: Google Apps Script URL (用於日曆或其他整合)

### 3. 本地開發

```bash
npm run dev
```

開啟 `http://localhost:3000` 即可預覽。

## 🚢 部署指令

專案已配置 Cloudflare Pages 部署流程：

```bash
# 執行 Cloudflare 專用的構建指令
npm run build-cloudflare
```

## 📂 目錄結構

- `src/app`: Next.js 頁面與佈局 (App Router)
- `src/components`: 可重用的 React 組件
- `src/lib`: 工具函式與 Supabase Client 初始化
- `src/services`: API 請求與後端邏輯封裝
- `src/types`: TypeScript 型別定義
- `wrangler.toml`: Cloudflare Pages 部署設定
