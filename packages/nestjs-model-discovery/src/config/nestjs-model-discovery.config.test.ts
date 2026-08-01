import { describe, expect, it } from 'vitest';

import {
  buildModelDiscoveryConfig,
  configValidationSchema,
  DEFAULT_CACHE_TTL_MS,
  DEFAULT_HARD_TTL_MULTIPLIER,
} from './nestjs-model-discovery.config';

describe('configValidationSchema', () => {
  it('passes valid env values', () => {
    const { error } = configValidationSchema.validate({
      LLM_DISCOVERY_CACHE_TTL_MS: '0',
      LLM_DISCOVERY_CONCURRENCY: '12',
      LLM_FINGERPRINT_TIMEOUT_MS: '1500',
      LLM_HOSTS: 'localhost,host.docker.internal',
      LLM_PORTS: '11434,1234',
      LLM_PROBE_TIMEOUT_MS: '3000',
      LM_STUDIO_URL: 'http://localhost:1234',
      OLLAMA_BASE_URL: 'http://localhost:11434',
      OLLAMA_URL: 'http://localhost:11434',
    });
    expect(error).toBeUndefined();
  });

  it('ignores unknown keys', () => {
    const { error } = configValidationSchema.validate({
      SOME_UNRELATED_ENV: 'whatever',
    });
    expect(error).toBeUndefined();
  });

  it('rejects a non-numeric timeout', () => {
    const { error } = configValidationSchema.validate({
      LLM_PROBE_TIMEOUT_MS: 'abc',
    });
    expect(error?.message).toMatch(/LLM_PROBE_TIMEOUT_MS/);
  });

  it('rejects a concurrency below the minimum', () => {
    const { error } = configValidationSchema.validate({
      LLM_DISCOVERY_CONCURRENCY: '0',
    });
    expect(error?.message).toMatch(/LLM_DISCOVERY_CONCURRENCY/);
  });

  it('rejects a non-uri provider url', () => {
    const { error } = configValidationSchema.validate({
      OLLAMA_BASE_URL: 'not a url',
    });
    expect(error?.message).toMatch(/OLLAMA_BASE_URL/);
  });
});

describe('buildModelDiscoveryConfig', () => {
  it('throws on malformed env rather than silently coercing to defaults', () => {
    expect(() =>
      buildModelDiscoveryConfig({ LLM_PROBE_TIMEOUT_MS: 'abc' }),
    ).toThrow(/Invalid model-discovery env configuration/);
  });

  it('falls back to defaults when knobs are absent', () => {
    const config = buildModelDiscoveryConfig({});
    expect(config.cacheTtlMs).toBe(DEFAULT_CACHE_TTL_MS);
  });

  it('honours a provided cache ttl of 0', () => {
    const config = buildModelDiscoveryConfig({
      LLM_DISCOVERY_CACHE_TTL_MS: '0',
    });
    expect(config.cacheTtlMs).toBe(0);
  });

  it('defaults the hard TTL to a multiple of the soft TTL', () => {
    const config = buildModelDiscoveryConfig({});
    expect(config.hardTtlMs).toBe(
      DEFAULT_CACHE_TTL_MS * DEFAULT_HARD_TTL_MULTIPLIER,
    );
  });

  it('honours an explicit hard TTL', () => {
    const config = buildModelDiscoveryConfig({
      LLM_DISCOVERY_CACHE_TTL_MS: '30000',
      LLM_DISCOVERY_HARD_TTL_MS: '90000',
    });
    expect(config.hardTtlMs).toBe(90_000);
  });

  it('clamps the hard TTL up to the soft TTL when smaller', () => {
    const config = buildModelDiscoveryConfig({
      LLM_DISCOVERY_CACHE_TTL_MS: '60000',
      LLM_DISCOVERY_HARD_TTL_MS: '1000',
    });
    expect(config.hardTtlMs).toBe(60_000);
  });

  it('collapses the hard TTL to 0 when caching is disabled', () => {
    const config = buildModelDiscoveryConfig({
      LLM_DISCOVERY_CACHE_TTL_MS: '0',
    });
    expect(config.hardTtlMs).toBe(0);
  });
});
