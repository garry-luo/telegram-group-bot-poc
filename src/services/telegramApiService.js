import { fetch } from "undici";

const TG_API_BASE = "https://api.telegram.org";

/**
 * 呼叫 Telegram Bot API
 * @param {string} botToken
 * @param {string} method
 * @param {Record<string, any>} [body]
 */
async function callApi(botToken, method, body) {
  const url = `${TG_API_BASE}/bot${botToken}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  return callApi(botToken, "setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message", "my_chat_member", "callback_query"],
  });
}

/**
 * 刪除 Webhook
 * @param {string} botToken
 */
export async function deleteWebhook(botToken) {
  return callApi(botToken, "deleteWebhook", {});
}

/**
 * 離開群組
 * @param {string} botToken
 * @param {number|bigint} chatId
 */
export async function leaveChat(botToken, chatId) {
  return callApi(botToken, "leaveChat", { chat_id: chatId });
}

/**
 * 取得群組資訊
 * @param {string} botToken
 * @param {number|bigint} chatId
 */
export async function getChat(botToken, chatId) {
  return callApi(botToken, "getChat", { chat_id: chatId });
}

/**
 * 發送訊息
 * @param {string} botToken
 * @param {number|bigint} chatId
 * @param {string} text
 * @param {Record<string, any>} [options]
 */
export async function sendMessage(botToken, chatId, text, options = {}) {
  return callApi(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    ...options,
  });
}

/**
 * 回應 callback_query（消除 loading 狀態）
 * @param {string} botToken
 * @param {string} callbackQueryId
 * @param {string} [text]
 */
export async function answerCallbackQuery(botToken, callbackQueryId, text) {
  return callApi(botToken, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

/**
 * 更新訊息的 inline keyboard
 * @param {string} botToken
 * @param {{ chat_id: number, message_id: number, reply_markup: object }} params
 */
export async function editMessageReplyMarkup(botToken, params) {
  return callApi(botToken, "editMessageReplyMarkup", params);
}
