import { Router } from "express";
import * as botSettingService from "../services/botSettingService.js";
import * as groupChatService from "../services/groupChatService.js";
import * as telegramApiService from "../services/telegramApiService.js";
import * as botSettingRepository from "../repositories/botSettingRepository.js";
import * as groupChatRepository from "../repositories/groupChatRepository.js";

const router = Router();

// --- Bot 設定 ---

/**
 * POST /api/console/bot-settings
 * 建立/更新 Bot，自動呼叫 setWebhook
 */
router.post("/bot-settings", async (req, res) => {
  const { botToken, adminTgUserId, ngrokBaseUrl } = req.body ?? {};
  if (!botToken || !ngrokBaseUrl) {
    return res
      .status(400)
      .json({ success: false, error: "botToken 和 ngrokBaseUrl 為必填" });
  }
  const result = await botSettingService.upsertAndSetWebhook({
    botToken,
    adminTgUserId: adminTgUserId ? Number(adminTgUserId) : undefined,
    ngrokBaseUrl,
  });
  res.json({ success: true, data: result });
});

/**
 * GET /api/console/bot-settings
 * 取得 Bot 設定（不回傳 token）
 */
router.get("/bot-settings", async (_req, res) => {
  const setting = await botSettingService.getSetting();
  res.json({ success: true, data: setting });
});

// --- 群組管理 ---

/**
 * GET /api/console/group-chats
 * 群組分頁列表
 */
router.get("/group-chats", async (req, res) => {
  const bot = await botSettingRepository.findFirst();
  if (!bot) {
    return res.status(404).json({ success: false, error: "尚未建立 Bot 設定" });
  }

  const { status, page = "1", size = "20" } = req.query;
  const result = await groupChatService.listGroups({
    botId: bot.id,
    status: status !== undefined && status !== "" ? Number(status) : undefined,
    page: parseInt(page, 10),
    size: parseInt(size, 10),
  });

  res.json({ success: true, data: result });
});

/**
 * POST /api/console/group-chat/approve
 * 核准群組
 */
router.post("/group-chat/approve", async (req, res) => {
  const { chatId } = req.body ?? {};
  if (!chatId) {
    return res.status(400).json({ success: false, error: "chatId 為必填" });
  }
  const bot = await botSettingRepository.findFirst();
  if (!bot) {
    return res.status(404).json({ success: false, error: "尚未建立 Bot 設定" });
  }
  const group = await groupChatService.approve({
    botId: bot.id,
    chatId: Number(chatId),
  });
  res.json({ success: true, data: group });
});

/**
 * POST /api/console/group-chat/reject
 * 拒絕群組
 */
router.post("/group-chat/reject", async (req, res) => {
  const { chatId } = req.body ?? {};
  if (!chatId) {
    return res.status(400).json({ success: false, error: "chatId 為必填" });
  }
  const bot = await botSettingRepository.findFirst();
  if (!bot) {
    return res.status(404).json({ success: false, error: "尚未建立 Bot 設定" });
  }
  const group = await groupChatService.reject({
    botId: bot.id,
    chatId: Number(chatId),
  });
  res.json({ success: true, data: group });
});

/**
 * DELETE /api/console/group-chat
 * 刪除群組記錄（用於清除 REJECTED，讓 Bot 可以重新加入）
 */
router.delete("/group-chat", async (req, res) => {
  const { chatId } = req.body ?? {};
  if (!chatId) {
    return res.status(400).json({ success: false, error: "chatId 為必填" });
  }
  const bot = await botSettingRepository.findFirst();
  if (!bot) {
    return res.status(404).json({ success: false, error: "尚未建立 Bot 設定" });
  }
  await groupChatRepository.deleteByBotIdAndChatId({
    botId: bot.id,
    chatId: Number(chatId),
  });
  res.json({ success: true });
});

/**
 * POST /api/console/group-chat/manual-add
 * 手動新增群組（先驗證 Bot 在群組中）
 * 呼叫外部功能一律由 3rd 路由處理，此處僅做驗證後寫入 DB
 */
router.post("/group-chat/manual-add", async (req, res) => {
  const { chatId } = req.body ?? {};
  if (!chatId) {
    return res.status(400).json({ success: false, error: "chatId 為必填" });
  }

  const bot = await botSettingRepository.findFirstWithToken();
  if (!bot) {
    return res.status(404).json({ success: false, error: "尚未建立 Bot 設定" });
  }

  const numericChatId = Number(chatId);

  // 檢查 DB 是否已有此群組記錄
  const existing = await groupChatRepository.findByBotIdAndChatId(
    bot.id,
    numericChatId,
  );
  if (existing) {
    const statusMsg = {
      0: "審核中（PENDING）",
      1: "已啟用（ACTIVE）",
      2: "已拒絕（REJECTED），請先刪除記錄再重新新增",
    };
    return res.status(409).json({
      success: false,
      error: `此群組已存在：${statusMsg[existing.status] ?? existing.status}`,
    });
  }

  // 取得 Bot 自身 ID，再用 getChatMember 確認 Bot 確實在群組中
  const botInfo = await telegramApiService.getMe(bot.bot_token).catch((err) => {
    throw Object.assign(new Error(`無法取得 Bot 資訊：${err.message}`), {
      statusCode: 500,
    });
  });

  const member = await telegramApiService
    .getChatMember(bot.bot_token, numericChatId, botInfo.id)
    .catch((err) => {
      throw Object.assign(
        new Error(`Bot 不在此群組或群組不存在：${err.message}`),
        { statusCode: 400 },
      );
    });

  const activeStatuses = ["member", "administrator", "creator"];
  if (!activeStatuses.includes(member.status)) {
    return res
      .status(400)
      .json({
        success: false,
        error: `Bot 不在此群組中（狀態：${member.status}）`,
      });
  }

  const chatInfo = await telegramApiService
    .getChat(bot.bot_token, numericChatId)
    .catch(() => ({ title: null, type: null, username: null }));

  const group = await groupChatService.addPending({
    botId: bot.id,
    chatId: numericChatId,
    chatTitle: chatInfo.title,
    chatType: chatInfo.type,
    chatUsername: chatInfo.username,
  });

  res.json({ success: true, data: group });
});

export default router;
