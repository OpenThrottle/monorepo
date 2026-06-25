import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function importFreshModule(): Promise<typeof import('../metrics-api')> {
  // Re-import so the module-level singleton resets between tests.
  vi.resetModules();
  return import('../metrics-api');
}

describe('metrics-api config', () => {
  beforeEach(() => {
    delete process.env.OPENTHROTTLE_API_URL;
    delete process.env.API_URL;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllEnvs();
  });

  it('falls back to the default base URL when nothing is set', async () => {
    const { getMetricsApiBaseUrl } = await importFreshModule();
    expect(getMetricsApiBaseUrl()).toBe('http://localhost:6010');
  });

  it('round-trips a value set via setMetricsApiBaseUrl', async () => {
    const { getMetricsApiBaseUrl, setMetricsApiBaseUrl } =
      await importFreshModule();
    setMetricsApiBaseUrl('https://api.example.com');
    expect(getMetricsApiBaseUrl()).toBe('https://api.example.com');
  });

  it('trims a trailing slash on set', async () => {
    const { getMetricsApiBaseUrl, setMetricsApiBaseUrl } =
      await importFreshModule();
    setMetricsApiBaseUrl('https://api.example.com/');
    expect(getMetricsApiBaseUrl()).toBe('https://api.example.com');
  });

  it('trims only a single trailing slash on set', async () => {
    const { getMetricsApiBaseUrl, setMetricsApiBaseUrl } =
      await importFreshModule();
    setMetricsApiBaseUrl('https://api.example.com//');
    expect(getMetricsApiBaseUrl()).toBe('https://api.example.com/');
  });

  it('prefers the explicitly set URL over the env fallback', async () => {
    process.env.OPENTHROTTLE_API_URL = 'https://from-env.example.com';
    const { getMetricsApiBaseUrl, setMetricsApiBaseUrl } =
      await importFreshModule();
    setMetricsApiBaseUrl('https://explicit.example.com');
    expect(getMetricsApiBaseUrl()).toBe('https://explicit.example.com');
  });

  it('uses OPENTHROTTLE_API_URL from the env fallback when not set', async () => {
    process.env.OPENTHROTTLE_API_URL = 'https://from-env.example.com';
    const { getMetricsApiBaseUrl } = await importFreshModule();
    expect(getMetricsApiBaseUrl()).toBe('https://from-env.example.com');
  });

  it('trims a trailing slash on the env fallback value', async () => {
    process.env.OPENTHROTTLE_API_URL = 'https://from-env.example.com/';
    const { getMetricsApiBaseUrl } = await importFreshModule();
    expect(getMetricsApiBaseUrl()).toBe('https://from-env.example.com');
  });

  it('prefers OPENTHROTTLE_API_URL over API_URL', async () => {
    process.env.OPENTHROTTLE_API_URL = 'https://preferred.example.com';
    process.env.API_URL = 'https://secondary.example.com';
    const { getMetricsApiBaseUrl } = await importFreshModule();
    expect(getMetricsApiBaseUrl()).toBe('https://preferred.example.com');
  });

  it('falls back to API_URL when OPENTHROTTLE_API_URL is absent', async () => {
    process.env.API_URL = 'https://secondary.example.com';
    const { getMetricsApiBaseUrl } = await importFreshModule();
    expect(getMetricsApiBaseUrl()).toBe('https://secondary.example.com');
  });

  it('ignores an empty-string env value and uses the default', async () => {
    process.env.OPENTHROTTLE_API_URL = '';
    process.env.API_URL = '';
    const { getMetricsApiBaseUrl } = await importFreshModule();
    expect(getMetricsApiBaseUrl()).toBe('http://localhost:6010');
  });

  it('ignores an empty-string set value and falls back to env/default', async () => {
    process.env.OPENTHROTTLE_API_URL = 'https://from-env.example.com';
    const { getMetricsApiBaseUrl, setMetricsApiBaseUrl } =
      await importFreshModule();
    setMetricsApiBaseUrl('');
    expect(getMetricsApiBaseUrl()).toBe('https://from-env.example.com');
  });
});
