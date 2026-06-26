import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { disconnectRedisCaches, getRedisCache } from './redis';

/**
 * Fake Keyv/KeyvRedis stand-ins. Both real classes are EventEmitters that emit
 * `error` on connection failures and expose `disconnect()`, so the fakes mirror
 * that surface without opening a real Redis connection.
 */
class FakeStore extends EventEmitter {
  disconnect = vi.fn(async () => undefined);
}

interface KeyvRedisCall {
  options: { namespace?: string } | undefined;
  uri: string;
}

const fakeKeyvRedisInstances: FakeStore[] = [];
const fakeKeyvRedisCalls: KeyvRedisCall[] = [];
const fakeKeyvInstances: FakeStore[] = [];

vi.mock('@keyv/redis', () => ({
  default: class {
    constructor(uri: string, options: { namespace?: string } | undefined) {
      const instance = new FakeStore();
      fakeKeyvRedisInstances.push(instance);
      fakeKeyvRedisCalls.push({ options, uri });
      return instance;
    }
  },
}));

vi.mock('keyv', () => ({
  default: class {
    constructor() {
      const instance = new FakeStore();
      fakeKeyvInstances.push(instance);
      return instance;
    }
  },
}));

const lastOf = (stores: FakeStore[]): FakeStore => {
  const store = stores[stores.length - 1];
  if (!store) throw new Error('expected a fake store to have been created');
  return store;
};

const lastKeyvRedisCall = (): KeyvRedisCall => {
  const call = fakeKeyvRedisCalls[fakeKeyvRedisCalls.length - 1];
  if (!call) throw new Error('expected KeyvRedis to have been constructed');
  return call;
};

describe('redis cache', () => {
  beforeEach(() => {
    fakeKeyvRedisInstances.length = 0;
    fakeKeyvRedisCalls.length = 0;
    fakeKeyvInstances.length = 0;
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    delete process.env.APP_NAME;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_TLS;
    delete process.env.REDIS_USERNAME;
  });

  afterEach(async () => {
    await disconnectRedisCaches();
    delete process.env.APP_NAME;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_TLS;
    delete process.env.REDIS_USERNAME;
    vi.clearAllMocks();
  });

  describe('namespace and URI construction', () => {
    it('namespaces the cache with APP_NAME when set', () => {
      process.env.APP_NAME = 'openthrottle-server';

      getRedisCache();

      expect(lastKeyvRedisCall().options?.namespace).toBe(
        'openthrottle-server-graphql-cache',
      );
    });

    it('falls back to the default namespace when APP_NAME is unset', () => {
      getRedisCache();

      expect(lastKeyvRedisCall().options?.namespace).toBe(
        'openthrottle - default-graphql-cache',
      );
    });

    it('builds a plain redis URI without credentials by default', () => {
      getRedisCache();

      expect(lastKeyvRedisCall().uri).toBe('redis://localhost:6379');
    });

    it('uses the rediss scheme when TLS is enabled', () => {
      process.env.REDIS_TLS = 'true';

      getRedisCache();

      expect(lastKeyvRedisCall().uri).toBe('rediss://localhost:6379');
    });

    it('embeds url-encoded credentials when username/password are set', () => {
      process.env.REDIS_USERNAME = 'user@name';
      process.env.REDIS_PASSWORD = 'p@ss:word';

      getRedisCache();

      expect(lastKeyvRedisCall().uri).toBe(
        'redis://user%40name:p%40ss%3Aword@localhost:6379',
      );
    });

    it('embeds a password-only credential with an empty username', () => {
      process.env.REDIS_PASSWORD = 'secret';

      getRedisCache();

      expect(lastKeyvRedisCall().uri).toBe('redis://:secret@localhost:6379');
    });
  });

  it('attaches error listeners to both the store and the keyv wrapper', () => {
    getRedisCache();

    expect(lastOf(fakeKeyvRedisInstances).listenerCount('error')).toBe(1);
    expect(lastOf(fakeKeyvInstances).listenerCount('error')).toBe(1);
  });

  it('routes connection errors to the logger instead of throwing', () => {
    const logger = { error: vi.fn(), warn: vi.fn() };

    getRedisCache(logger);

    const store = lastOf(fakeKeyvRedisInstances);
    // Without a registered listener this would throw as an unhandled 'error'.
    expect(() => store.emit('error', new Error('ECONNREFUSED'))).not.toThrow();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('handles connection errors even when no logger is provided', () => {
    getRedisCache();

    const keyv = lastOf(fakeKeyvInstances);
    expect(() => keyv.emit('error', new Error('boom'))).not.toThrow();
  });

  it('disconnects every registered store on shutdown', async () => {
    getRedisCache();
    getRedisCache();

    const stores = [...fakeKeyvInstances];
    await disconnectRedisCaches();

    for (const store of stores) {
      expect(store.disconnect).toHaveBeenCalledTimes(1);
    }
  });

  it('does not re-disconnect stores on a second shutdown', async () => {
    getRedisCache();
    const store = lastOf(fakeKeyvInstances);

    await disconnectRedisCaches();
    await disconnectRedisCaches();

    expect(store.disconnect).toHaveBeenCalledTimes(1);
  });

  it('logs and swallows disconnect failures', async () => {
    const logger = { error: vi.fn(), warn: vi.fn() };
    getRedisCache(logger);

    const store = lastOf(fakeKeyvInstances);
    store.disconnect.mockRejectedValueOnce(new Error('disconnect failed'));

    await expect(disconnectRedisCaches(logger)).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
