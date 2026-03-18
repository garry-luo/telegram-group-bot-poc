import { Router } from "express";
import * as telegramApiService from "../services/telegramApiService.js";
import * as botSettingRepository from "../repositories/botSettingRepository.js";

const router = Router();

/**
 * 取得 Bot token，若不存在則拋出錯誤
 * @param {number} [botId]
 */
async function requireBot(botId) {
  const bot = botId
    ? await botSettingRepository.findById(botId)
    : await botSettingRepository.findFirstWithToken();
  if (!bot) {
    const err = new Error("尚未建立 Bot 設定");
    err.statusCode = 404;
    throw err;
  }
  return bot;
}

/**
 * POST /api/3rd/telegram/leave-chat
 * 呼叫 Telegram leaveChat
 */
router.post("/leave-chat", async (req, res) => {
  const { botId, chatId } = req.body ?? {};
  if (!chatId) {
    return res.status(400).json({ success: false, error: "chatId 為必填" });
  }
  const bot = await requireBot(botId ? Number(botId) : undefined);
  const result = await telegramApiService.leaveChat(
    bot.bot_token,
    Number(chatId),
  );
  res.json({ success: true, data: result });
});

/**
 * GET /api/3rd/telegram/get-chat
 * 呼叫 Telegram getChat
 */
router.get("/get-chat", async (req, res) => {
  const { botId, chatId } = req.query;
  if (!chatId) {
    return res.status(400).json({ success: false, error: "chatId 為必填" });
  }
  const bot = await requireBot(botId ? Number(botId) : undefined);
  const result = await telegramApiService.getChat(
    bot.bot_token,
    Number(chatId),
  );
  res.json({ success: true, data: result });
});

/**
 * POST /api/3rd/telegram/send-message
 * 發送訊息
 */
router.post("/send-message", async (req, res) => {
  const { botId, chatId, text, options } = req.body ?? {};
  if (!chatId || !text) {
    return res
      .status(400)
      .json({ success: false, error: "chatId 和 text 為必填" });
  }
  const bot = await requireBot(botId ? Number(botId) : undefined);
  const result = await telegramApiService.sendMessage(
    bot.bot_token,
    Number(chatId),
    text,
    options,
  );
  res.json({ success: true, data: result });
});

export default router;
