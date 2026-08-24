import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleDestroy, OnModuleInit {
  private readonly memoryCache = new Map<string, { value: unknown; expiry: number }>();
  private readonly logger = new Logger(CacheService.name);
  private client: RedisClientType | null = null;
  private mode: 'redis' | 'memory' | 'disabled' = 'disabled';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') ?? 'redis';
    const port = this.configService.get<number>('REDIS_PORT') ?? 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

    try {
      this.client = createClient({
        socket: { host, port },
        password,
        database: this.configService.get<number>('REDIS_DB') ?? 0,
      });
      this.client.on('error', (error) => {
        this.logger.warn(`Redis cache error: ${error.message}`);
      });
      await this.client.connect();
      this.mode = 'redis';
      this.logger.log(`Cache service initialized (redis ${host}:${port})`);
    } catch (error) {
      const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
      const message = error instanceof Error ? error.message : String(error);
      this.client = null;

      if (nodeEnv === 'development' || nodeEnv === 'test') {
        this.mode = 'memory';
        this.logger.warn(`Redis unavailable, using in-memory cache: ${message}`);
        return;
      }

      this.mode = 'disabled';
      this.logger.warn(`Redis unavailable, cache disabled: ${message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.mode === 'redis' && this.client?.isOpen) {
        const value = await this.client.get(key);
        return value ? (JSON.parse(value) as T) : null;
      }

      if (this.mode !== 'memory') return null;

      const entry = this.memoryCache.get(key);
      if (!entry) return null;

      if (entry.expiry && Date.now() > entry.expiry) {
        this.memoryCache.delete(key);
        return null;
      }

      return entry.value as T;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Cache get error for key ${key}: ${errorMsg}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds ?? this.configService.get<number>('REDIS_TTL_SECONDS') ?? 300;

      if (this.mode === 'redis' && this.client?.isOpen) {
        await this.client.set(key, JSON.stringify(value), { EX: ttl });
        return;
      }

      if (this.mode !== 'memory') return;

      const expiry = ttl ? Date.now() + ttl * 1000 : 0;
      this.memoryCache.set(key, { value, expiry });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Cache set error for key ${key}: ${errorMsg}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.mode === 'redis' && this.client?.isOpen) {
        await this.client.del(key);
        return;
      }

      this.memoryCache.delete(key);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Cache delete error for key ${key}: ${errorMsg}`);
    }
  }

  async reset(): Promise<void> {
    try {
      if (this.mode === 'redis' && this.client?.isOpen) {
        await this.client.flushDb();
        return;
      }

      this.memoryCache.clear();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Cache reset error: ${errorMsg}`);
    }
  }

  isReady(): boolean {
    return this.mode === 'redis' && Boolean(this.client?.isReady);
  }

  getStats(): { keys: number; memory: string; mode: string } {
    const keys = this.memoryCache.size;
    const memory = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;
    return { keys, memory, mode: this.mode };
  }
}
