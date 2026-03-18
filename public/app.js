// ── 狀態 ──────────────────────────────────────────────────────────────────────
let currentPage = 1;
const PAGE_SIZE = 20;

const STATUS_LABEL = { 0: "PENDING", 1: "ACTIVE", 2: "REJECTED" };

// ── 工具函式 ──────────────────────────────────────────────────────────────────

function showMsg(elId, msg, isError = false) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.className = `msg ${isError ? "err" : "ok"}`;
}

function clearMsg(elId) {
  const el = document.getElementById(elId);
  el.textContent = "";
  el.className = "msg";
}

async function apiFetch(path, options = {}) {
  const resp = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const data = await resp.json();
  if (!data.success) throw new Error(data.error ?? `HTTP ${resp.status}`);
  return data.data;
}

function formatDate(str) {
  if (!str) return "";
  return new Date(str).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Bot 設定 ──────────────────────────────────────────────────────────────────

async function loadBotSetting() {
  clearMsg("botMsg");
  try {
    const data = await apiFetch("/api/console/bot-settings");
    if (data) {
      document.getElementById("adminTgUserId").value =
        data.admin_tg_user_id ?? "";
    }
  } catch (err) {
    showMsg("botMsg", `載入失敗：${err.message}`, true);
  }
}

async function saveBotSetting() {
  clearMsg("botMsg");
  const botToken = document.getElementById("botToken").value.trim();
  const adminTgUserId = document.getElementById("adminTgUserId").value.trim();
  const ngrokBaseUrl = document
    .getElementById("ngrokBaseUrl")
    .value.trim()
    .replace(/\/$/, "");

  if (!botToken || !ngrokBaseUrl) {
    showMsg("botMsg", "Bot Token 和 Ngrok Base URL 為必填", true);
    return;
  }

  try {
    const data = await apiFetch("/api/console/bot-settings", {
      method: "POST",
      body: JSON.stringify({
        botToken,
        adminTgUserId: adminTgUserId || undefined,
        ngrokBaseUrl,
      }),
    });
    showMsg("botMsg", `儲存成功！Webhook URL：${data.webhookUrl}`);
    loadGroups(1);
  } catch (err) {
    showMsg("botMsg", `儲存失敗：${err.message}`, true);
  }
}

// ── 群組列表 ──────────────────────────────────────────────────────────────────

async function loadGroups(page = 1) {
  clearMsg("groupMsg");
  currentPage = page;
  const status = document.getElementById("filterStatus").value;

  try {
    const params = new URLSearchParams({ page, size: PAGE_SIZE });
    if (status !== "") params.set("status", status);

    const data = await apiFetch(`/api/console/group-chats?${params}`);
    renderGroupTable(data.rows);
    renderPager(data.total, page);
  } catch (err) {
    showMsg("groupMsg", `載入失敗：${err.message}`, true);
  }
}

function renderGroupTable(rows) {
  const tbody = document.getElementById("groupTbody");
  if (!rows || rows.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#999">無資料</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((g) => {
      const statusBadge = `<span class="badge badge-${g.status}">${STATUS_LABEL[g.status] ?? g.status}</span>`;
      const ops = [];
      if (g.status === 0) {
        ops.push(
          `<button class="sm success" onclick="approveGroup(${g.chat_id})">核准</button>`,
        );
        ops.push(
          `<button class="sm danger" onclick="rejectGroup(${g.chat_id})">拒絕</button>`,
        );
      }
      if (g.status === 1) {
        ops.push(
          `<button class="sm danger" onclick="rejectGroup(${g.chat_id})">踢出</button>`,
        );
      }
      if (g.status === 2) {
        ops.push(
          `<button class="sm danger" onclick="deleteGroup(${g.chat_id})">刪除記錄</button>`,
        );
      }
      const operatorName = [
        g.operator_name,
        g.operator_username ? `@${g.operator_username}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<tr>
      <td><code>${g.chat_id}</code></td>
      <td>${escHtml(g.chat_title ?? "")}</td>
      <td>${g.chat_type ?? ""}</td>
      <td>${statusBadge}</td>
      <td>${escHtml(operatorName)}</td>
      <td>${formatDate(g.created_at)}</td>
      <td>${ops.join(" ")}</td>
    </tr>`;
    })
    .join("");
}

function renderPager(total, page) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pager = document.getElementById("pager");
  if (totalPages <= 1) {
    pager.innerHTML = "";
    return;
  }

  const items = [];
  if (page > 1)
    items.push(`<button onclick="loadGroups(${page - 1})">上一頁</button>`);
  items.push(
    `<span style="line-height:32px;font-size:.85rem">${page} / ${totalPages}（共 ${total} 筆）</span>`,
  );
  if (page < totalPages)
    items.push(`<button onclick="loadGroups(${page + 1})">下一頁</button>`);
  pager.innerHTML = items.join("");
}

async function approveGroup(chatId) {
  if (!confirm(`確認核准群組 ${chatId}？`)) return;
  clearMsg("groupMsg");
  try {
    await apiFetch("/api/console/group-chat/approve", {
      method: "POST",
      body: JSON.stringify({ chatId }),
    });
    showMsg("groupMsg", `群組 ${chatId} 已核准`);
    loadGroups(currentPage);
  } catch (err) {
    showMsg("groupMsg", `核准失敗：${err.message}`, true);
  }
}

async function rejectGroup(chatId) {
  if (!confirm(`確認拒絕/踢出群組 ${chatId}？Bot 將離開該群組。`)) return;
  clearMsg("groupMsg");
  try {
    await apiFetch("/api/console/group-chat/reject", {
      method: "POST",
      body: JSON.stringify({ chatId }),
    });
    showMsg("groupMsg", `群組 ${chatId} 已拒絕，Bot 已離開`);
    loadGroups(currentPage);
  } catch (err) {
    showMsg("groupMsg", `拒絕失敗：${err.message}`, true);
  }
}

async function deleteGroup(chatId) {
  if (!confirm(`確認刪除群組 ${chatId} 的記錄？刪除後 Bot 可重新加入此群組。`))
    return;
  clearMsg("groupMsg");
  try {
    await apiFetch("/api/console/group-chat", {
      method: "DELETE",
      body: JSON.stringify({ chatId }),
    });
    showMsg("groupMsg", `群組 ${chatId} 記錄已刪除`);
    loadGroups(currentPage);
  } catch (err) {
    showMsg("groupMsg", `刪除失敗：${err.message}`, true);
  }
}

// ── 手動新增群組 ──────────────────────────────────────────────────────────────

async function manualAdd() {
  clearMsg("manualMsg");
  const chatId = document.getElementById("manualChatId").value.trim();
  if (!chatId) {
    showMsg("manualMsg", "請輸入 Chat ID", true);
    return;
  }
  try {
    await apiFetch("/api/console/group-chat/manual-add", {
      method: "POST",
      body: JSON.stringify({ chatId: Number(chatId) }),
    });
    showMsg("manualMsg", `群組 ${chatId} 已加入 PENDING 列表`);
    document.getElementById("manualChatId").value = "";
    loadGroups(currentPage);
  } catch (err) {
    showMsg("manualMsg", `新增失敗：${err.message}`, true);
  }
}

// ── 工具：HTML 跳脫 ───────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── 初始化 ────────────────────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", () => {
  loadBotSetting();
  loadGroups(1);
});
