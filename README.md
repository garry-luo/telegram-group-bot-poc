# Telegram Bot 群組管理 POC

驗證 Bot 加入群組 → PENDING → 管理員核准/拒絕 → Bot 執行對應動作的完整流程。

## 技術棧

- Node.js 22.x, ESM
- Express 5.x
- PostgreSQL 16（Docker）
- undici（呼叫 Telegram API）
- ngrok（Webhook 公開 URL）

## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env

# 3. 啟動 PostgreSQL
docker compose up -d

# 4. 啟動伺服器
npm run dev
```

另開終端機啟動 ngrok：

```bash
ngrok http 3001
```

開啟瀏覽器進入 `http://localhost:3001`，填入 Bot Token、Admin Telegram User ID、Ngrok URL，儲存後即完成 Webhook 設定。

## 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `PORT` | 伺服器 port | `3001` |
| `NODE_ENV` | 環境 | `development` |
| `DATABASE_URL` | PostgreSQL 連線字串 | - |

## API 路由

### Webhook
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/webhook` | 接收 Telegram 事件 |

### Console 管理
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/console/bot-settings` | 建立/更新 Bot，自動設定 Webhook |
| GET  | `/api/console/bot-settings` | 取得 Bot 設定 |
| GET  | `/api/console/group-chats` | 群組列表（支援 status/page/size 篩選） |
| POST | `/api/console/group-chat/approve` | 核准群組 |
| POST | `/api/console/group-chat/reject` | 拒絕群組，Bot 自動離群 |
| DELETE | `/api/console/group-chat` | 刪除群組記錄（解除 REJECTED 封鎖） |
| POST | `/api/console/group-chat/manual-add` | 手動新增群組至 PENDING |

### 3rd Handler
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/3rd/telegram/leave-chat` | 呼叫 Telegram leaveChat |
| GET  | `/api/3rd/telegram/get-chat` | 呼叫 Telegram getChat |
| POST | `/api/3rd/telegram/send-message` | 發送訊息 |

## 群組狀態流程

```
Bot 被加入群組 → PENDING
PENDING + 核准  → ACTIVE（Bot 發送通知）
PENDING + 拒絕  → REJECTED（Bot 自動離群）
REJECTED + 再次加入 → Bot 立即離群（記錄保留）
REJECTED + Console 刪除記錄 → 可重新申請
```

## Bot 指令

| 指令 | 說明 | 權限 |
|------|------|------|
| `/approve <chatId>` | 核准群組 | 管理員 |
| `/reject <chatId>` | 拒絕群組 | 管理員 |
| `/groups` | 列出待審核群組 | 管理員 |
| `/chatid` | 回傳當前群組 Chat ID | 任何人 |

## 目錄結構

```
├── db/schema.sql              # 建表 DDL
├── public/                    # 前端管理介面
├── src/
│   ├── server.js              # Express 入口
│   ├── config/                # 環境設定
│   ├── db/                    # DB 連線池
│   ├── repositories/          # SQL 查詢
│   ├── services/              # 業務邏輯
│   ├── handlers/              # Webhook 事件處理
│   ├── routes/                # API 路由
│   └── middlewares/
└── docker-compose.yml
```
