import { EventEmitter } from 'node:events';
import { createMock } from '@golevelup/ts-vitest';
import type { Redis, RedisOptions } from 'ioredis';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRedisClient, disconnectRedisClient } from './redis-client';

/**
 * Fake ioredis stand-in: the real client is an EventEmitter that emits `error`
 * on connection failures and exposes `quit()`, so the fake mirrors exactly that
 * surface without opening a real Redis connection.
 */
class FakeRedis extends EventEmitter {
  quit = vi.fn(async () => 'OK');
}

const fakeInstances: FakeRedis[] = [];
const fakeOptions: RedisOptions[] = [];

vi.mock('ioredis', () => ({
  Redis: class {
    constructor(options: RedisOptions) {
      const instance = new FakeRedis();
      fakeInstances.push(instance);
      fakeOptions.push(options);
      return instance;
    }
  },
}));

const lastInstance = (): FakeRedis => {
  const instance = fakeInstances[fakeInstances.length - 1];
  if (!instance) throw new Error('expected a fake Redis to have been created');
  return instance;
};

const lastOptions = (): RedisOptions => {
  const options = fakeOptions[fakeOptions.length - 1];
  if (!options) throw new Error('expected Redis to have been constructed');
  return options;
};

describe('createRedisClient', () => {
  beforeEach(() => {
    fakeInstances.length = 0;
    fakeOptions.length = 0;
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_TLS;
    delete process.env.REDIS_USERNAME;
  });

  afterEach(() => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_TLS;
    delete process.env.REDIS_USERNAME;
    vi.clearAllMocks();
  });

  it('returns null when REDIS_HOST is unset', () => {
    delete process.env.REDIS_HOST;

    expect(createRedisClient()).toBeNull();
    expect(fakeInstances).toHaveLength(0);
  });

  it('builds a lazily-connecting client from redisConfig', () => {
    createRedisClient();

    expect(lastOptions()).toMatchObject({
      host: 'localhost',
      lazyConnect: true,
      port: 6379,
    });
    expect(lastOptions().tls).toBeUndefined();
  });

  it('enables tls when REDIS_TLS is set', () => {
    process.env.REDIS_TLS = 'true';

    createRedisClient();

    expect(lastOptions().tls).toEqual({});
  });

  it('passes username/password through to the client', () => {
    process.env.REDIS_USERNAME = 'user';
    process.env.REDIS_PASSWORD = 'secret';

    createRedisClient();

    expect(lastOptions()).toMatchObject({
      password: 'secret',
      username: 'user',
    });
  });

  it('routes connection errors to the logger instead of throwing', () => {
    const logger = { error: vi.fn(), warn: vi.fn() };

    createRedisClient(logger);

    const client = lastInstance();
    // Without a registered listener this would throw as an unhandled 'error'.
    expect(() => client.emit('error', new Error('ECONNREFUSED'))).not.toThrow();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('handles connection errors even when no logger is provided', () => {
    createRedisClient();

    const client = lastInstance();
    expect(() => client.emit('error', new Error('boom'))).not.toThrow();
  });
});

describe('disconnectRedisClient', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('quits the client on shutdown', async () => {
    const quit = vi.fn(async () => 'OK' as const);
    const client = createMock<Redis>({ quit });

    await disconnectRedisClient(client);

    expect(quit).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for a null (unconfigured) client', async () => {
    await expect(disconnectRedisClient(null)).resolves.toBeUndefined();
  });

  it('logs and swallows quit failures', async () => {
    const logger = { error: vi.fn(), warn: vi.fn() };
    const quit = vi.fn().mockRejectedValueOnce(new Error('quit failed'));
    const client = createMock<Redis>({ quit });

    await expect(
      disconnectRedisClient(client, logger),
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
