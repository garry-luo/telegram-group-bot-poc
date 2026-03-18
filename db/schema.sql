-- Telegram Bot POC Schema

-- 單一 Bot 設定（POC 只有一筆）
CREATE TABLE telegram_bot_setting (
  id               SERIAL PRIMARY KEY,
  bot_token        VARCHAR(200) NOT NULL,
  admin_tg_user_id BIGINT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

-- Webhook URL 使用 DB id（如 /webhook），與 bot_token 無關

CREATE TABLE telegram_bot_group_chat (
  id               SERIAL PRIMARY KEY,
  bot_id           INT NOT NULL REFERENCES telegram_bot_setting(id),
  chat_id          BIGINT NOT NULL,
  chat_title       VARCHAR(255),
  chat_type        VARCHAR(20),
  chat_username    VARCHAR(100),
  status           SMALLINT NOT NULL DEFAULT 0,   -- 0=PENDING 1=ACTIVE 2=REJECTED
  operator_tg_id   BIGINT,
  operator_username VARCHAR(100),
  operator_name    VARCHAR(200),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE (bot_id, chat_id)
);
