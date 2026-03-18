import 'dotenv/config';

const config = Object.freeze({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
});

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export default config;
