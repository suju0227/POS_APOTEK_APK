import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { CacheService } from './cache.service';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('CacheService', () => {
  const createClientMock = createClient as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    createClientMock.mockReset();
    createClientMock.mockReturnValue({
      connect: jest.fn().mockRejectedValue(new Error('redis unavailable')),
      on: jest.fn(),
      isOpen: false,
      isReady: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('falls back to in-memory cache during test mode', async () => {
    const service = new CacheService(
      new ConfigService({
        NODE_ENV: 'test',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6390,
        REDIS_TTL_SECONDS: 300,
      }),
    );

    await service.onModuleInit();
    await service.set('master:data', { ok: true }, 1);

    await expect(service.get('master:data')).resolves.toEqual({ ok: true });

    jest.advanceTimersByTime(1001);
    await expect(service.get('master:data')).resolves.toBeNull();
  });

  it('deletes cached values', async () => {
    const service = new CacheService(
      new ConfigService({
        NODE_ENV: 'test',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6390,
      }),
    );

    await service.onModuleInit();
    await service.set('units:all', ['tablet']);
    await service.del('units:all');

    await expect(service.get('units:all')).resolves.toBeNull();
  });
});
