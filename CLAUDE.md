# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用指令

```bash
# 安裝依賴
npm install

# 開發模式（檔案修改自動重啟）
npm run dev

# 正式模式
npm start

# 啟動 PostgreSQL（Docker）
docker compose up -d

# 套用 DB schema
psql $DATABASE_URL -f db/schema.sql
```

此專案無測試框架，無 lint 設定。

## 架構概覽

**Node.js 22 ESM + Express 5 + PostgreSQL**，以 Webhook 驅動的 Telegram Bot。

### 請求流向

```
Telegram → POST /webhook
  → webhook.js (立即回 200，非同步分派)
    → myChatMemberHandler   (Bot 在群組的成員狀態變化)
    → callbackQueryHandler  (Inline Keyboard 按鈕點擊)
    → messageCommandHandler (文字指令 /approve /reject 等)
```

### 分層結構

| 層      | 目錄                  | 職責                               |
|---------|-----------------------|------------------------------------|
| Routes  | `src/routes/`         | HTTP 入口，參數驗證，呼叫 Service  |
| Handlers| `src/handlers/`       | Telegram update 事件分派與處理     |
| Services| `src/services/`       | 業務邏輯（群組狀態機、通知發送）   |
| Repos   | `src/repositories/`   | 純 SQL 查詢，無業務邏輯            |
| TelegramAPI | `src/services/telegramApiService.js` | 封裝所有 Telegram Bot API 呼叫（使用 undici fetch）|

### 群組狀態機

`groupChatService.STATUS` = `{ PENDING: 0, ACTIVE: 1, REJECTED: 2 }`

- Bot 被加入群組 → `myChatMemberHandler` → `groupChatService.addPending()` → 寫 DB + 通知 admin（含 Inline Keyboard）
- Admin 點按鈕 → `callbackQueryHandler` → `groupChatService.approve/reject()`
- 核准：更新 DB 為 ACTIVE，在群組發通知
- 拒絕：更新 DB 為 REJECTED，Bot 發訊息後 leaveChat
- REJECTED 再次加入：`myChatMemberHandler` 偵測到立即 leaveChat，不更新 DB

### 路由說明

- `/webhook` — Telegram Webhook 端點，所有 update 由此進入
- `/api/console/*` — 管理後台 API（Bot 設定、群組審核、手動新增）
- `/api/3rd/telegram/*` — 直接代理呼叫 Telegram API 的端點（供外部系統或調試用）

### Bot 設定

單一 Bot 設計（POC），設定存於 `telegram_bot_setting` 表，包含 `bot_token` 與 `admin_tg_user_id`。Webhook URL 格式為 `{ngrokBaseUrl}/webhook`，在 Console UI 儲存設定時自動呼叫 Telegram setWebhook 設定。

### 手動新增群組流程

`POST /api/console/group-chat/manual-add`：
1. 檢查 DB 是否已有記錄（防重複）
2. 呼叫 `getMe` 取得 Bot ID
3. 呼叫 `getChatMember` 確認 Bot 確實在群組中
4. 呼叫 `getChat` 取得群組資訊
5. 寫入 PENDING 並通知 admin
