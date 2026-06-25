import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { Schema } from '../src/nestjs-typeorm.config';
import { getTypeormConfig, schema } from '../src/nestjs-typeorm.config';

/**
 * A complete, valid set of required env values used as the base for schema
 * tests. The optional connection-hardening knobs are intentionally omitted so
 * the schema's defaults are exercised.
 */
const validEnv = {
  POSTGRES_DB: 'openthrottle',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PASSWORD: 'super-secret-pw',
  POSTGRES_PATH_MIGRATIONS: 'dist/migrations/*.js',
  POSTGRES_PORT: 5432,
  POSTGRES_USER: 'postgres',
  POSTGRES_VERSION: '16',
} as const;

describe('schema (Joi env validation)', () => {
  it('accepts a complete valid env', () => {
    const { error } = schema.validate(validEnv);

    expect(error).toBeUndefined();
  });

  it('fails closed when POSTGRES_PASSWORD is missing', () => {
    const { POSTGRES_PASSWORD: _omitted, ...withoutPassword } = validEnv;
    const { error } = schema.validate(withoutPassword);

    expect(error).toBeDefined();
    expect(error?.message).toContain('POSTGRES_PASSWORD');
  });

  it('fails closed when POSTGRES_PASSWORD is empty', () => {
    const { error } = schema.validate({ ...validEnv, POSTGRES_PASSWORD: '' });

    expect(error).toBeDefined();
    expect(error?.message).toContain('POSTGRES_PASSWORD');
  });

  it.each([
    'POSTGRES_DB',
    'POSTGRES_HOST',
    'POSTGRES_PATH_MIGRATIONS',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_VERSION',
  ] as const)('fails closed when required key %s is missing', (key) => {
    const { [key]: _omitted, ...withoutKey } = validEnv;
    const { error } = schema.validate(withoutKey);

    expect(error).toBeDefined();
    expect(error?.message).toContain(key);
  });

  it('rejects a non-numeric port', () => {
    const { error } = schema.validate({
      ...validEnv,
      POSTGRES_PORT: 'not-a-port',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('POSTGRES_PORT');
  });

  it('rejects an out-of-range port', () => {
    const { error } = schema.validate({ ...validEnv, POSTGRES_PORT: 70_000 });

    expect(error).toBeDefined();
    expect(error?.message).toContain('POSTGRES_PORT');
  });

  it('applies defaults for the optional connection-hardening knobs', () => {
    const { error, value } = schema.validate(validEnv);

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      POSTGRES_CONNECT_TIMEOUT_MS: 10_000,
      POSTGRES_IDLE_TIMEOUT_MS: 30_000,
      POSTGRES_POOL_MAX: 10,
      POSTGRES_SSL: false,
      POSTGRES_SSL_REJECT_UNAUTHORIZED: true,
      POSTGRES_STATEMENT_TIMEOUT_MS: 30_000,
    });
  });

  it('rejects a pool max below 1', () => {
    const { error } = schema.validate({ ...validEnv, POSTGRES_POOL_MAX: 0 });

    expect(error).toBeDefined();
    expect(error?.message).toContain('POSTGRES_POOL_MAX');
  });

  it('rejects a negative connect timeout', () => {
    const { error } = schema.validate({
      ...validEnv,
      POSTGRES_CONNECT_TIMEOUT_MS: -1,
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('POSTGRES_CONNECT_TIMEOUT_MS');
  });
});

/**
 * Builds a real `ConfigService` seeded with an explicit internal config. This
 * exercises the actual `getOrThrow` semantics `getTypeormConfig` relies on:
 * present keys are returned, absent ones throw (`NODE_ENV=test` keeps the
 * Postgres vars out of `process.env`, so a missing key has no fallback).
 */
const buildConfigService = (values: Partial<Schema>): ConfigService =>
  new ConfigService({ ...values });

const fullConfig: Schema = {
  ...validEnv,
  POSTGRES_CONNECT_TIMEOUT_MS: 10_000,
  POSTGRES_IDLE_TIMEOUT_MS: 30_000,
  POSTGRES_POOL_MAX: 10,
  POSTGRES_SSL: false,
  POSTGRES_SSL_REJECT_UNAUTHORIZED: true,
  POSTGRES_STATEMENT_TIMEOUT_MS: 30_000,
};

describe('getTypeormConfig', () => {
  it('returns every key from the config service', () => {
    const config = getTypeormConfig(buildConfigService(fullConfig));

    expect(config).toStrictEqual(fullConfig);
  });

  it('throws loudly when a required key is absent', () => {
    const { POSTGRES_PASSWORD: _omitted, ...partial } = fullConfig;

    expect(() => getTypeormConfig(buildConfigService(partial))).toThrow(
      'POSTGRES_PASSWORD',
    );
  });

  it('does not leak the password through JSON serialization or string coercion', () => {
    const password = 'p@ssw0rd-do-not-leak';
    const config = getTypeormConfig(
      buildConfigService({ ...fullConfig, POSTGRES_PASSWORD: password }),
    );

    // The getter is a plain read-through, so the password is present on the
    // returned object by design — but it must never appear in any incidental
    // string rendering of the config (logs, error messages, etc.).
    expect(
      JSON.stringify({ ...config, POSTGRES_PASSWORD: '[redacted]' }),
    ).not.toContain(password);
    expect(`${config}`).not.toContain(password);
  });
});
