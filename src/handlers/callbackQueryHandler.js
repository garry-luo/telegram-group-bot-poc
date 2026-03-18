import * as groupChatService from '../services/groupChatService.js';
import * as botSettingService from '../services/botSettingService.js';
import * as telegramApiService from '../services/telegramApiService.js';

/**
 * 處理 callback_query 事件（Inline Keyboard 按鈕點擊）
 * @param {object} update
 * @param {number} botId
 */
export async function handle(update, botId) {
  const callbackQuery = update.callback_query;
  if (!callbackQuery) return;

  const { id: callbackId, from, data } = callbackQuery;
  const bot = await botSettingService.getBotWithToken(botId);
  if (!bot) return;

  // 驗證只有管理員可以操作
  if (from.id !== Number(bot.admin_tg_user_id)) {
    await telegramApiService.answerCallbackQuery(bot.bot_token, callbackId, '權限不足').catch(() => {});
    return;
  }

  const [action, chatIdStr] = data.split(':');
  const chatId = parseInt(chatIdStr, 10);
  if (!chatId) return;

  try {
    if (action === 'approve') {
      await groupChatService.approve({ botId, chatId });
      await telegramApiService.answerCallbackQuery(bot.bot_token, callbackId, `已核准群組 ${chatId}`);
      await editMessageButtons(bot.bot_token, callbackQuery, '已核准');
    } else if (action === 'reject') {
      await groupChatService.reject({ botId, chatId });
      await telegramApiService.answerCallbackQuery(bot.bot_token, callbackId, `已拒絕群組 ${chatId}`);
      await editMessageButtons(bot.bot_token, callbackQuery, '已拒絕');
    }
  } catch (err) {
    console.warn(`[CallbackQuery] 處理失敗: ${err.message}`);
    await telegramApiService.answerCallbackQuery(bot.bot_token, callbackId, `操作失敗：${err.message}`).catch(() => {});
  }
}

/**
 * 將通知訊息的 inline keyboard 更新為結果文字，避免重複點擊
 */
async function editMessageButtons(botToken, callbackQuery, resultText) {
  const { message } = callbackQuery;
  if (!message) return;

  await telegramApiService.editMessageReplyMarkup(botToken, {
    chat_id: message.chat.id,
    message_id: message.message_id,
    reply_markup: { inline_keyboard: [[{ text: resultText, callback_data: 'noop' }]] },
  }).catch(() => {});
}
