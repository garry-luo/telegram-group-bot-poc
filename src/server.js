import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import webhookRouter from './routes/webhook.js';
import consoleRouter from './routes/console.js';
import thirdPartyRouter from './routes/thirdParty.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Body parsing
app.use(express.json());

// 靜態前端
app.use(express.static(path.join(__dirname, '..', 'public')));

// 健康檢查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook（接收 Telegram 事件）
app.use('/webhook', webhookRouter);

// Console 管理 API
app.use('/api/console', consoleRouter);

// 3rd Handler API
app.use('/api/3rd/telegram', thirdPartyRouter);

// 全域錯誤處理
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode ?? 500;
  console.error(`[Server] Error ${statusCode}:`, err.message);
  res.status(statusCode).json({ success: false, error: err.message });
});

app.listen(config.port, () => {
  console.info(`[Server] Telegram Bot POC running on port ${config.port}`);
  console.info(`[Server] Console UI: http://localhost:${config.port}`);
  console.info(`[Server] Health: http://localhost:${config.port}/health`);
});

export default app;
