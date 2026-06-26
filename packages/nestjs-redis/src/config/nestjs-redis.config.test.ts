import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { redisConfig } from './nestjs-redis.config';

/**
 * `redisConfig` is a `registerAs('redis', ...)` factory; calling it directly
 * executes the env-parsing function and returns the resolved config object.
 */
describe('redisConfig', () => {
  const ENV_KEYS = [
    'REDIS_HOST',
    'REDIS_PASSWORD',
    'REDIS_PORT',
    'REDIS_TLS',
    'REDIS_USERNAME',
  ] as const;

  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = savedEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('parses the full set of env vars into a typed config', () => {
    process.env.REDIS_HOST = 'redis.example.com';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 'secret';
    process.env.REDIS_USERNAME = 'default';
    process.env.REDIS_TLS = 'true';

    expect(redisConfig()).toStrictEqual({
      host: 'redis.example.com',
      password: 'secret',
      port: 6380,
      tls: true,
      username: 'default',
    });
  });

  it('coerces the string REDIS_PORT to a number', () => {
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6380';

    const config = redisConfig();

    expect(config.port).toBe(6380);
    expect(typeof config.port).toBe('number');
  });

  it('defaults the port to 6379 when REDIS_PORT is unset', () => {
    process.env.REDIS_HOST = 'localhost';

    expect(redisConfig().port).toBe(6379);
  });

  it('defaults the port to 6379 when REDIS_PORT is non-numeric', () => {
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = 'not-a-number';

    expect(redisConfig().port).toBe(6379);
  });

  it('leaves password and username undefined when unset', () => {
    process.env.REDIS_HOST = 'localhost';

    const config = redisConfig();

    expect(config.password).toBeUndefined();
    expect(config.username).toBeUndefined();
  });

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
    ['', false],
  ])('parses REDIS_TLS=%j as %s', (value, expected) => {
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_TLS = value;

    expect(redisConfig().tls).toBe(expected);
  });

  it('defaults tls to false when REDIS_TLS is unset', () => {
    process.env.REDIS_HOST = 'localhost';

    expect(redisConfig().tls).toBe(false);
  });

  it('throws when REDIS_HOST is not set', () => {
    expect(() => redisConfig()).toThrow('REDIS_HOST is not set');
  });
});
