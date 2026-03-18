import { Router } from 'express';
import * as botSettingRepository from '../repositories/botSettingRepository.js';
import * as myChatMemberHandler from '../handlers/myChatMemberHandler.js';
import * as messageCommandHandler from '../handlers/messageCommandHandler.js';

const router = Router();

/**
 * POST /webhook
 * 接收 Telegram Webhook 事件
 * 立即回 200，非同步處理
 */
router.post('/', async (req, res) => {
  // 立即回應 200，避免 Telegram 重試
  res.sendStatus(200);

  const update = req.body;
  if (!update) return;

  // 取得 Bot 設定（單一 Bot，取第一筆）
  const bot = await botSettingRepository.findFirstWithToken().catch((err) => {
    console.error('[Webhook] 取得 Bot 設定失敗:', err.message);
    return null;
  });

  if (!bot) {
    console.warn('[Webhook] 無 Bot 設定，略過 update:', update.update_id);
    return;
  }

  // 非同步分派事件
  processUpdate(update, bot.id).catch((err) => {
    console.error(`[Webhook] 處理 update ${update.update_id} 失敗:`, err.message);
  });
});

/**
 * 分派 Telegram update 至對應 handler
 * @param {object} update
 * @param {number} botId
 */
async function processUpdate(update, botId) {
  if (update.my_chat_member) {
    await myChatMemberHandler.handle(update, botId);
    return;
  }

  if (update.message) {
    await messageCommandHandler.handle(update, botId);
    return;
  }

  console.debug(`[Webhook] 未處理的 update 類型: ${Object.keys(update).join(', ')}`);
}

export default router;
