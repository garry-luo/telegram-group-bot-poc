import * as groupChatService from '../services/groupChatService.js';
import * as botSettingService from '../services/botSettingService.js';
import * as telegramApiService from '../services/telegramApiService.js';

const { STATUS } = groupChatService;

/**
 * 處理 message 事件中的指令
 * @param {object} update - Telegram update 物件
 * @param {number} botId
 */
export async function handle(update, botId) {
  const message = update.message;
  if (!message?.text) return;

  const text = message.text.trim();
  if (!text.startsWith('/')) return;

  const bot = await botSettingService.getBotWithToken(botId);
  if (!bot) return;

  const fromId = message.from?.id;
  const chatId = message.chat?.id;
  const isPrivate = message.chat?.type === 'private';

  const [command, ...args] = text.split(/\s+/);
  const normalizedCommand = command.split('@')[0]; // 移除 @BotUsername 部分

  switch (normalizedCommand) {
    case '/approve': {
      if (fromId !== Number(bot.admin_tg_user_id)) {
        await reply(bot.bot_token, chatId, '權限不足，僅管理員可執行此指令。');
        return;
      }
      const targetChatId = parseInt(args[0], 10);
      if (!targetChatId) {
        await reply(bot.bot_token, chatId, '用法：/approve <chatId>');
        return;
      }
      try {
        await groupChatService.approve({ botId, chatId: targetChatId });
        await reply(bot.bot_token, chatId, `已核准群組 ${targetChatId}`);
      } catch (err) {
        await reply(bot.bot_token, chatId, `核准失敗：${err.message}`);
      }
      break;
    }

    case '/reject': {
      if (fromId !== Number(bot.admin_tg_user_id)) {
        await reply(bot.bot_token, chatId, '權限不足，僅管理員可執行此指令。');
        return;
      }
      const targetChatId = parseInt(args[0], 10);
      if (!targetChatId) {
        await reply(bot.bot_token, chatId, '用法：/reject <chatId>');
        return;
      }
      try {
        await groupChatService.reject({ botId, chatId: targetChatId });
        await reply(bot.bot_token, chatId, `已拒絕群組 ${targetChatId}`);
      } catch (err) {
        await reply(bot.bot_token, chatId, `拒絕失敗：${err.message}`);
      }
      break;
    }

    case '/groups': {
      if (fromId !== Number(bot.admin_tg_user_id)) {
        await reply(bot.bot_token, chatId, '權限不足，僅管理員可執行此指令。');
        return;
      }
      const { total, rows } = await groupChatService.listGroups({
        botId,
        status: STATUS.PENDING,
        page: 1,
        size: 10,
      });
      if (total === 0) {
        await reply(bot.bot_token, chatId, '目前沒有待審核的群組。');
        return;
      }
      const lines = rows.map((g) =>
        `• ${g.chat_title ?? 'N/A'} (${g.chat_id})\n  /approve ${g.chat_id} | /reject ${g.chat_id}`
      );
      await reply(bot.bot_token, chatId, `待審核群組（共 ${total} 個）：\n\n${lines.join('\n\n')}`);
      break;
    }

    case '/chatid': {
      // 群組內使用，回傳此群 Chat ID（私訊給發送者）
      if (isPrivate) {
        await reply(bot.bot_token, chatId, `此對話的 Chat ID：${chatId}`);
        return;
      }
      const groupChatId = message.chat?.id;
      await telegramApiService.sendMessage(
        bot.bot_token,
        fromId,
        `群組「${message.chat?.title ?? ''}」的 Chat ID：${groupChatId}`
      ).catch(() => {
        // 若無法私訊，就直接在群組回覆
        reply(bot.bot_token, chatId, `此群組的 Chat ID：${groupChatId}`);
      });
      break;
    }

    default:
      // 未知指令，不回應
      break;
  }
}

/**
 * @param {string} botToken
 * @param {number} chatId
 * @param {string} text
 */
function reply(botToken, chatId, text) {
  return telegramApiService.sendMessage(botToken, chatId, text).catch((err) => {
    console.warn(`[Command] 回覆失敗: ${err.message}`);
  });
}
