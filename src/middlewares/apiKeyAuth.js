import config from '../config/index.js';

/**
 * API Key 驗證 middleware
 * 從 X-API-Key header 取得並驗證
 */
export function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== config.consoleApiKey) {
    return res.status(401).json({ success: false, error: 'Invalid or missing API key' });
  }
  next();
}
