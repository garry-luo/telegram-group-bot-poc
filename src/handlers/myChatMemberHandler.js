import * as groupChatRepository from "../repositories/groupChatRepository.js";
import * as groupChatService from "../services/groupChatService.js";
import * as botSettingService from "../services/botSettingService.js";
import * as telegramApiService from "../services/telegramApiService.js";

const { STATUS } = groupChatService;

/**
 * 處理 my_chat_member 事件
 * 當 Bot 在群組中的成員狀態發生變化時觸發
 * @param {object} update - Telegram update 物件
 * @param {number} botId
 */
export async function handle(update, botId) {
  const myChatMember = update.my_chat_member;
  if (!myChatMember) return;

  const { chat, from, new_chat_member: newMember } = myChatMember;

  // 只處理群組（非 channel）
  if (chat.type === "channel") return;

  const newStatus = newMember?.status;

  // Bot 被加入（member 或 administrator）
  if (newStatus === "member" || newStatus === "administrator") {
    const existing = await groupChatRepository.findByBotIdAndChatId(
      botId,
      chat.id,
    );

    if (existing?.status === STATUS.REJECTED) {
      // 已被拒絕，立刻離開
      const bot = await botSettingService.getBotWithToken(botId);
      if (bot) {
        await telegramApiService
          .leaveChat(bot.bot_token, chat.id)
          .catch((err) => {
            console.warn(`[myChatMember] leaveChat 失敗: ${err.message}`);
          });
      }
      return;
    }

    if (existing?.status === STATUS.ACTIVE) {
      // 已是 ACTIVE，無動作
      return;
    }

    // null 或 PENDING -> 寫入/更新 PENDING
    await groupChatService.addPending({
      botId,
      chatId: chat.id,
      chatTitle: chat.title,
      chatType: chat.type,
      chatUsername: chat.username,
      operatorTgId: from?.id,
      operatorUsername: from?.username,
      operatorName: [from?.first_name, from?.last_name]
        .filter(Boolean)
        .join(" "),
    });

    console.info(
      `[myChatMember] 新增 PENDING 群組: chatId=${chat.id} title=${chat.title}`,
    );
    return;
  }

  // Bot 被踢出或離開（kicked / left）
  if (newStatus === "kicked" || newStatus === "left") {
    const existing = await groupChatRepository.findByBotIdAndChatId(
      botId,
      chat.id,
    );
    // REJECTED 狀態保留記錄，避免 Bot 主動 leaveChat 後把 REJECTED 記錄洗掉
    if (existing?.status === STATUS.REJECTED) return;
    await groupChatRepository.deleteByBotIdAndChatId({
      botId,
      chatId: chat.id,
    });
    console.info(`[myChatMember] 刪除群組記錄: chatId=${chat.id}`);
  }
}
