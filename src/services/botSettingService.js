import * as botSettingRepository from '../repositories/botSettingRepository.js';
import * as telegramApiService from './telegramApiService.js';

/**
 * 建立或更新 Bot 設定，並自動向 Telegram 設定 Webhook
 * @param {{ botToken: string, adminTgUserId?: number, ngrokBaseUrl: string }}
 * @returns {{ id: number, webhookUrl: string, admin_tg_user_id: number }}
 */
export async function upsertAndSetWebhook({ botToken, adminTgUserId, ngrokBaseUrl }) {
  const bot = await botSettingRepository.upsert({ botToken, adminTgUserId });
  const webhookUrl = `${ngrokBaseUrl}/webhook`;
  await telegramApiService.setWebhook(botToken, webhookUrl);
  console.info(`[BotSetting] Webhook set: ${webhookUrl} for bot id=${bot.id}`);
  return { ...bot, webhookUrl };
}

/**
 * 取得 Bot 設定（不含 token）
 */
export async function getSetting() {
  return botSettingRepository.findFirst();
}

/**
 * 取得 Bot（含 token，僅內部使用）
 * @param {number} [id]
 */
export async function getBotWithToken(id) {
  if (id) {
    return botSettingRepository.findById(id);
  }
  return botSettingRepository.findFirstWithToken();
}
