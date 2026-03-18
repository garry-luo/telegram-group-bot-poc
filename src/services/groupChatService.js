import * as groupChatRepository from '../repositories/groupChatRepository.js';
import * as botSettingService from './botSettingService.js';
import * as telegramApiService from './telegramApiService.js';

export const STATUS = Object.freeze({ PENDING: 0, ACTIVE: 1, REJECTED: 2 });

/**
 * 新增 PENDING 群組，若有 adminTgUserId 則發送通知
 * @param {{ botId: number, chatId: number, chatTitle?: string, chatType?: string,
 *           chatUsername?: string, operatorTgId?: number, operatorUsername?: string,
 *           operatorName?: string }}
 */
export async function addPending(data) {
  const group = await groupChatRepository.insert(data);
  const bot = await botSettingService.getBotWithToken(data.botId);

  if (bot?.admin_tg_user_id) {
    const chatDesc = data.chatTitle ?? `#${data.chatId}`;
    const text = [
      `[新群組申請]`,
      `群組: ${chatDesc}`,
      `Chat ID: ${data.chatId}`,
      `類型: ${data.chatType ?? 'unknown'}`,
      `操作者: ${data.operatorName ?? 'unknown'} (@${data.operatorUsername ?? 'N/A'})`,
      ``,
      `核准: /approve ${data.chatId}`,
      `拒絕: /reject ${data.chatId}`,
    ].join('\n');

    await telegramApiService.sendMessage(bot.bot_token, bot.admin_tg_user_id, text).catch((err) => {
      console.warn(`[GroupChat] 通知 admin 失敗: ${err.message}`);
    });
  }

  return group;
}

/**
 * 核准群組：改 ACTIVE，在群組發訊息
 * @param {{ botId: number, chatId: number }}
 */
export async function approve({ botId, chatId }) {
  const group = await groupChatRepository.updateStatus({ botId, chatId, status: STATUS.ACTIVE });
  if (!group) {
    throw new Error(`Group not found: botId=${botId} chatId=${chatId}`);
  }

  const bot = await botSettingService.getBotWithToken(botId);
  if (bot) {
    await telegramApiService
      .sendMessage(bot.bot_token, chatId, '此群組已通過審核，Bot 服務已啟用。')
      .catch((err) => console.warn(`[GroupChat] 發送核准通知失敗: ${err.message}`));
  }

  return group;
}

/**
 * 拒絕群組：改 REJECTED，呼叫 leaveChat
 * @param {{ botId: number, chatId: number }}
 */
export async function reject({ botId, chatId }) {
  const group = await groupChatRepository.updateStatus({ botId, chatId, status: STATUS.REJECTED });
  if (!group) {
    throw new Error(`Group not found: botId=${botId} chatId=${chatId}`);
  }

  const bot = await botSettingService.getBotWithToken(botId);
  if (bot) {
    await telegramApiService
      .sendMessage(bot.bot_token, chatId, '此群組申請已被拒絕，Bot 即將離開。')
      .catch(() => {});
    await telegramApiService
      .leaveChat(bot.bot_token, chatId)
      .catch((err) => console.warn(`[GroupChat] leaveChat 失敗: ${err.message}`));
  }

  return group;
}

/**
 * 群組列表（分頁）
 * @param {{ botId: number, status?: number, page?: number, size?: number }}
 */
export async function listGroups({ botId, status, page, size }) {
  return groupChatRepository.listByBotId({ botId, status, page, size });
}
