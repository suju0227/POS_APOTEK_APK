import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  name: process.env.APP_NAME ?? 'POS_APOTEK',
  port: Number(process.env.APP_PORT ?? process.env.PORT ?? 3000),
  host: process.env.APP_HOST ?? '0.0.0.0',
  apiPrefix: process.env.API_PREFIX ?? '/api',
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  frontendUrl: process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  timezone: process.env.APP_TIMEZONE ?? 'Asia/Makassar',
  localNetworkMode: process.env.LOCAL_NETWORK_MODE === 'true',
  localServerIp: process.env.LOCAL_SERVER_IP,
}));
