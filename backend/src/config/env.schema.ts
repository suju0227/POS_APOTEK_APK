import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  APP_PORT: Joi.number().port().optional(),
  APP_HOST: Joi.string().default('0.0.0.0'),
  APP_NAME: Joi.string().default('POS_APOTEK'),
  APP_URL: Joi.string().uri().default('http://localhost:5173'),
  FRONTEND_URL: Joi.string().uri().optional(),
  API_PREFIX: Joi.string().default('/api'),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_SECRET: Joi.string().min(16).optional(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  CORS_ALLOW_LOCAL_NETWORK: Joi.boolean().truthy('true').falsy('false').default(false),
  LOCAL_NETWORK_MODE: Joi.boolean().truthy('true').falsy('false').default(false),
  LOCAL_SERVER_IP: Joi.string().ip({ version: ['ipv4'] }).optional(),
  REDIS_HOST: Joi.string().default('redis'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().integer().min(0).default(0),
  REDIS_TTL_SECONDS: Joi.number().integer().min(1).default(300),
  APP_TIMEZONE: Joi.string().valid('Asia/Makassar').default('Asia/Makassar'),
  EXPORT_DIR: Joi.string().default('storage/exports'),
});
