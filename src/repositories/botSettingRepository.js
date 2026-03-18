import { query } from '../db/pool.js';

/**
 * 取得第一筆 Bot 設定（POC 單一 Bot）
 */
export async function findFirst() {
  const result = await query(
    'SELECT id, admin_tg_user_id, created_at, updated_at FROM telegram_bot_setting ORDER BY id LIMIT 1'
  );
  return result.rows[0] ?? null;
}

/**
 * 取得 Bot 設定（含 token，僅內部使用）
 * @param {number} id
 */
export async function findById(id) {
  const result = await query(
    'SELECT * FROM telegram_bot_setting WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}

/**
 * 取得第一筆 Bot（含 token）
 */
export async function findFirstWithToken() {
  const result = await query(
    'SELECT * FROM telegram_bot_setting ORDER BY id LIMIT 1'
  );
  return result.rows[0] ?? null;
}

/**
 * 新增或更新 Bot 設定（POC 只有一筆，以 id=1 做 upsert）
 * @param {{ botToken: string, adminTgUserId?: number }} data
 * @returns {{ id: number, admin_tg_user_id: number }}
 */
export async function upsert({ botToken, adminTgUserId }) {
  const result = await query(
    `INSERT INTO telegram_bot_setting (id, bot_token, admin_tg_user_id, updated_at)
     VALUES (1, $1, $2, NOW())
     ON CONFLICT (id) DO UPDATE
       SET bot_token        = EXCLUDED.bot_token,
           admin_tg_user_id = EXCLUDED.admin_tg_user_id,
           updated_at       = NOW()
     RETURNING id, admin_tg_user_id, created_at, updated_at`,
    [botToken, adminTgUserId ?? null]
  );
  return result.rows[0];
}
