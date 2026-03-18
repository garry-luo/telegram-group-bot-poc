import { query } from '../db/pool.js';

/**
 * @param {number} botId
 * @param {bigint|number} chatId
 */
export async function findByBotIdAndChatId(botId, chatId) {
  const result = await query(
    'SELECT * FROM telegram_bot_group_chat WHERE bot_id = $1 AND chat_id = $2',
    [botId, chatId]
  );
  return result.rows[0] ?? null;
}

/**
 * @param {{ botId: number, status?: number, page?: number, size?: number }}
 */
export async function listByBotId({ botId, status, page = 1, size = 20 }) {
  const offset = (page - 1) * size;
  const params = [botId];
  let where = 'bot_id = $1';

  if (status !== undefined && status !== null && status !== '') {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM telegram_bot_group_chat WHERE ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(size, offset);
  const dataResult = await query(
    `SELECT * FROM telegram_bot_group_chat WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { total, rows: dataResult.rows };
}

/**
 * @param {{ botId: number, chatId: number, chatTitle?: string, chatType?: string,
 *           chatUsername?: string, operatorTgId?: number, operatorUsername?: string,
 *           operatorName?: string }}
 */
export async function insert({
  botId, chatId, chatTitle, chatType, chatUsername,
  operatorTgId, operatorUsername, operatorName,
}) {
  const result = await query(
    `INSERT INTO telegram_bot_group_chat
       (bot_id, chat_id, chat_title, chat_type, chat_username,
        status, operator_tg_id, operator_username, operator_name)
     VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8)
     ON CONFLICT (bot_id, chat_id) DO UPDATE
       SET chat_title       = EXCLUDED.chat_title,
           chat_type        = EXCLUDED.chat_type,
           chat_username    = EXCLUDED.chat_username,
           operator_tg_id   = EXCLUDED.operator_tg_id,
           operator_username = EXCLUDED.operator_username,
           operator_name    = EXCLUDED.operator_name,
           status           = 0,
           updated_at       = NOW()
     RETURNING *`,
    [botId, chatId, chatTitle ?? null, chatType ?? null, chatUsername ?? null,
     operatorTgId ?? null, operatorUsername ?? null, operatorName ?? null]
  );
  return result.rows[0];
}

/**
 * @param {{ botId: number, chatId: number, status: number }}
 */
export async function updateStatus({ botId, chatId, status }) {
  const result = await query(
    `UPDATE telegram_bot_group_chat
     SET status = $3, updated_at = NOW()
     WHERE bot_id = $1 AND chat_id = $2
     RETURNING *`,
    [botId, chatId, status]
  );
  return result.rows[0] ?? null;
}

/**
 * @param {{ botId: number, chatId: number }}
 */
export async function deleteByBotIdAndChatId({ botId, chatId }) {
  await query(
    'DELETE FROM telegram_bot_group_chat WHERE bot_id = $1 AND chat_id = $2',
    [botId, chatId]
  );
}
