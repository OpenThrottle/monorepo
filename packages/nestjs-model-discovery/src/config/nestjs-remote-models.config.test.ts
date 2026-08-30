import { describe, expect, it } from 'vitest';

import {
  buildRemoteModelsConfig,
  DEFAULT_REMOTE_CACHE_TTL_MS,
  DEFAULT_REMOTE_HARD_TTL_MS,
  remoteModelsValidationSchema,
} from './nestjs-remote-models.config';

describe('remoteModelsValidationSchema', () => {
  it('passes valid env values', () => {
    const { error } = remoteModelsValidationSchema.validate({
      OPENROUTER_API_KEY: 'sk-or-v1-test',
      OPENROUTER_APP_TITLE: 'OpenThrottle',
      OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
      OPENROUTER_CATALOG_CACHE_TTL_MS: '3600000',
      OPENROUTER_CATALOG_HARD_TTL_MS: '86400000',
      OPENROUTER_CATALOG_TIMEOUT_MS: '10000',
      OPENROUTER_SITE_URL: 'https://openthrottle.ai',
    });
    expect(error).toBeUndefined();
  });

  it('ignores unknown keys', () => {
    const { error } = remoteModelsValidationSchema.validate({
      SOME_UNRELATED_ENV: 'whatever',
    });
    expect(error).toBeUndefined();
  });

  it('rejects a non-uri base url', () => {
    const { error } = remoteModelsValidationSchema.validate({
      OPENROUTER_BASE_URL: 'not a url',
    });
    expect(error?.message).toMatch(/OPENROUTER_BASE_URL/);
  });

  it('rejects a non-numeric timeout', () => {
    const { error } = remoteModelsValidationSchema.validate({
      OPENROUTER_CATALOG_TIMEOUT_MS: 'abc',
    });
    expect(error?.message).toMatch(/OPENROUTER_CATALOG_TIMEOUT_MS/);
  });
});

describe('buildRemoteModelsConfig', () => {
  it('is unconfigured with an empty key when nothing is set', () => {
    const config = buildRemoteModelsConfig({});

    expect(config.apiKey).toBe('');
    expect(config.configured).toBe(false);
    expect(config.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(config.cacheTtlMs).toBe(DEFAULT_REMOTE_CACHE_TTL_MS);
    expect(config.hardTtlMs).toBe(DEFAULT_REMOTE_HARD_TTL_MS);
  });

  it('treats a blank key as unset rather than configured', () => {
    const config = buildRemoteModelsConfig({ OPENROUTER_API_KEY: '   ' });

    expect(config.apiKey).toBe('');
    expect(config.configured).toBe(false);
  });

  it('reports configured once a key is present', () => {
    const config = buildRemoteModelsConfig({
      OPENROUTER_API_KEY: 'sk-or-v1-test',
    });

    expect(config.configured).toBe(true);
  });

  it('sends no attribution headers when neither knob is set', () => {
    expect(buildRemoteModelsConfig({}).headers).toEqual({});
  });

  it('builds the attribution headers OpenRouter documents', () => {
    const config = buildRemoteModelsConfig({
      OPENROUTER_APP_TITLE: 'OpenThrottle',
      OPENROUTER_SITE_URL: 'https://openthrottle.ai',
    });

    expect(config.headers).toEqual({
      'HTTP-Referer': 'https://openthrottle.ai',
      'X-OpenRouter-Title': 'OpenThrottle',
    });
  });

  it('never puts the api key into a header', () => {
    const config = buildRemoteModelsConfig({
      OPENROUTER_API_KEY: 'sk-or-v1-secret',
      OPENROUTER_APP_TITLE: 'OpenThrottle',
    });

    expect(JSON.stringify(config.headers)).not.toContain('sk-or-v1-secret');
  });

  it('honours explicit TTLs', () => {
    const config = buildRemoteModelsConfig({
      OPENROUTER_CATALOG_CACHE_TTL_MS: '30000',
      OPENROUTER_CATALOG_HARD_TTL_MS: '90000',
    });

    expect(config.cacheTtlMs).toBe(30_000);
    expect(config.hardTtlMs).toBe(90_000);
  });

  it('clamps the hard TTL up to the soft TTL when smaller', () => {
    const config = buildRemoteModelsConfig({
      OPENROUTER_CATALOG_CACHE_TTL_MS: '120000',
      OPENROUTER_CATALOG_HARD_TTL_MS: '1000',
    });

    expect(config.hardTtlMs).toBe(120_000);
  });

  it('throws on malformed env rather than silently coercing to defaults', () => {
    expect(() =>
      buildRemoteModelsConfig({ OPENROUTER_CATALOG_TIMEOUT_MS: 'abc' }),
    ).toThrow(/Invalid remote-models env configuration/);
  });
});
