import 'reflect-metadata';
import type { DynamicModule, Provider } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { redisConfig } from '../config/nestjs-bullmq.config';
import { NestjsBullmqModule } from './nestjs-bullmq.module';

/**
 * Pull the real BullMQ root `useFactory` out of the module's `@Module({ imports })`
 * metadata so the mapping assertion exercises the actual decorator wiring rather
 * than a re-implementation. The forRootAsync DynamicModule is the only import that
 * contributes a factory provider.
 */
const getRootUseFactory = (): ((config: {
  host: string;
  port: number;
}) => unknown) => {
  const imports: ReadonlyArray<DynamicModule> =
    Reflect.getMetadata('imports', NestjsBullmqModule) ?? [];

  for (const imported of imports) {
    const providers: ReadonlyArray<Provider> = imported.providers ?? [];

    for (const provider of providers) {
      if (
        typeof provider === 'object' &&
        provider !== null &&
        'useFactory' in provider &&
        typeof provider.useFactory === 'function'
      ) {
        return provider.useFactory;
      }
    }
  }

  throw new Error('BullMQ root useFactory not found in module metadata');
};

describe('NestjsBullmqModule.registerQueue', () => {
  it('returns a BullModule DynamicModule that registers the named queue', () => {
    const dynamic = NestjsBullmqModule.registerQueue('emails');

    expect(dynamic.module).toBeDefined();
    // BullModule.registerQueue exports a queue provider whose injection token
    // encodes the feature name, so the configured queue name shows up in exports.
    expect(JSON.stringify(dynamic.exports)).toContain('emails');
  });

  it('builds an independent DynamicModule per feature name', () => {
    const first = NestjsBullmqModule.registerQueue('emails');
    const second = NestjsBullmqModule.registerQueue('notifications');

    expect(JSON.stringify(first.exports)).toContain('emails');
    expect(JSON.stringify(second.exports)).toContain('notifications');
    expect(JSON.stringify(first.exports)).not.toContain('notifications');
  });
});

describe('redisConfig', () => {
  const originalHost = process.env.REDIS_HOST;
  const originalPort = process.env.REDIS_PORT;

  beforeEach(() => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
  });

  afterEach(() => {
    if (originalHost === undefined) delete process.env.REDIS_HOST;
    else process.env.REDIS_HOST = originalHost;
    if (originalPort === undefined) delete process.env.REDIS_PORT;
    else process.env.REDIS_PORT = originalPort;
  });

  it('throws when REDIS_HOST is unset', () => {
    expect(() => redisConfig()).toThrow('REDIS_HOST is not set');
  });

  it('returns host and the default port when REDIS_HOST is set without REDIS_PORT', () => {
    process.env.REDIS_HOST = 'redis.internal';

    const config = redisConfig();

    expect(config.host).toBe('redis.internal');
    expect(config.port).toBe(6379);
  });

  it('coerces REDIS_PORT to a number', () => {
    process.env.REDIS_HOST = 'redis.internal';
    process.env.REDIS_PORT = '6380';

    const config = redisConfig();

    expect(config.host).toBe('redis.internal');
    expect(config.port).toBe(6380);
  });
});

describe('NestjsBullmqModule BullMQ root factory mapping', () => {
  // Invoke the real forRootAsync useFactory with a stub redis config and assert
  // it produces { connection: { host, port }, defaultJobOptions } as wired in
  // the @Module decorator.
  it('maps the redis config into BullMQ connection options', () => {
    const useFactory = getRootUseFactory();

    const result = useFactory({ host: 'redis.internal', port: 6380 });

    expect(result).toMatchObject({
      connection: {
        host: 'redis.internal',
        port: 6380,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { delay: 2000, type: 'exponential' },
        keepLogs: 100,
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800 },
      },
    });
  });
});
