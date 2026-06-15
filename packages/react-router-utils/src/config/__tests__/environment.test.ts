import { afterEach, describe, expect, test, vi } from 'vitest';

const loadConfig = async (
  env: Record<string, unknown>,
): Promise<typeof import('../environment')> => {
  vi.resetModules();
  vi.stubGlobal('window', { env });
  return import('../environment');
};

describe('config/environment', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('IS_BROWSER is true under jsdom because document is present', async () => {
    const { IS_BROWSER } = await loadConfig({});

    expect(IS_BROWSER).toBe(true);
  });

  test('defaults NODE_ENV to development when unset', async () => {
    const config = await loadConfig({});

    expect(config.NODE_ENV).toBe('development');
    expect(config.IS_DEVELOPMENT).toBe(true);
    expect(config.IS_PRODUCTION).toBe(false);
    expect(config.IS_STAGING).toBe(false);
  });

  test('flags reflect a production NODE_ENV', async () => {
    const config = await loadConfig({ NODE_ENV: 'production' });

    expect(config.NODE_ENV).toBe('production');
    expect(config.IS_DEVELOPMENT).toBe(false);
    expect(config.IS_PRODUCTION).toBe(true);
    expect(config.IS_STAGING).toBe(false);
  });

  test('flags reflect a staging NODE_ENV', async () => {
    const config = await loadConfig({ NODE_ENV: 'staging' });

    expect(config.NODE_ENV).toBe('staging');
    expect(config.IS_DEVELOPMENT).toBe(true);
    expect(config.IS_PRODUCTION).toBe(false);
    expect(config.IS_STAGING).toBe(true);
  });
});
