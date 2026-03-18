import { fetch } from 'undici';

const TG_API_BASE = 'https://api.telegram.org';

/**
 * 呼叫 Telegram Bot API
 * @param {string} botToken
 * @param {string} method
 * @param {Record<string, any>} [body]
 */
async function callApi(botToken, method, body) {
  const url = `${TG_API_BASE}/bot${botToken}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram API error [${method}]: ${data.description}`);
  }
  return data.result;
}

/**
 * 設定 Webhook
 * @param {string} botToken
 * @param {string} webhookUrl
 */
export async function setWebhook(botToken, webhookUrl) {
  return callApi(botToken, 'setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message', 'my_chat_member'],
  });
}

/**
 * 刪除 Webhook
 * @param {string} botToken
 */
export async function deleteWebhook(botToken) {
  return callApi(botToken, 'deleteWebhook', {});
}

/**
 * 離開群組
 * @param {string} botToken
 * @param {number|bigint} chatId
 */
export async function leaveChat(botToken, chatId) {
  return callApi(botToken, 'leaveChat', { chat_id: chatId });
}

/**
 * 取得群組資訊
 * @param {string} botToken
 * @param {number|bigint} chatId
 */
export async function getChat(botToken, chatId) {
  return callApi(botToken, 'getChat', { chat_id: chatId });
}

/**
 * 發送訊息
 * @param {string} botToken
 * @param {number|bigint} chatId
 * @param {string} text
 * @param {Record<string, any>} [options]
 */
export async function sendMessage(botToken, chatId, text, options = {}) {
  return callApi(botToken, 'sendMessage', {
    chat_id: chatId,
    text,
    ...options,
  });
}
