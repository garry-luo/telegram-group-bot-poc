import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

const pool = new Pool({ connectionString: config.databaseUrl });

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * @param {string} text
 * @param {any[]} [params]
 */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development') {
    console.debug(`[DB] ${duration}ms | ${text.slice(0, 80)}`);
  }
  return result;
}

export default pool;
