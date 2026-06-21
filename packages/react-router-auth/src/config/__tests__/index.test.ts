import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// AUTH_COOKIE_NAME is computed from APP_NAME at module-load time, so each case
// resets the module registry and re-imports after arranging the environment.

const importConfig = async () => await import('../index');

describe('react-router-auth config', () => {
  const originalAppName = process.env.APP_NAME;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    delete process.env.APP_NAME;
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalAppName === undefined) {
      delete process.env.APP_NAME;
    } else {
      process.env.APP_NAME = originalAppName;
    }
  });

  it('exposes the shared cookie attribute defaults', async () => {
    const {
      AUTH_COOKIE_MAX_AGE_DAYS,
      AUTH_COOKIE_PATH,
      AUTH_COOKIE_SAME_SITE,
    } = await importConfig();

    expect(AUTH_COOKIE_MAX_AGE_DAYS).toBe(7);
    expect(AUTH_COOKIE_PATH).toBe('/');
    expect(AUTH_COOKIE_SAME_SITE).toBe('Lax');
  });

  it('derives AUTH_COOKIE_NAME from window.env.APP_NAME when present', async () => {
    vi.stubGlobal('window', { env: { APP_NAME: 'developer' } });

    const { AUTH_COOKIE_NAME } = await importConfig();

    expect(AUTH_COOKIE_NAME).toBe('developer_auth_token');
  });

  it('prefers window.env.APP_NAME over process.env.APP_NAME', async () => {
    process.env.APP_NAME = 'from-process';
    vi.stubGlobal('window', { env: { APP_NAME: 'from-window' } });

    const { AUTH_COOKIE_NAME } = await importConfig();

    expect(AUTH_COOKIE_NAME).toBe('from-window_auth_token');
  });

  it('falls back to process.env.APP_NAME when window is absent', async () => {
    process.env.APP_NAME = 'admin';
    vi.stubGlobal('window', undefined);

    const { AUTH_COOKIE_NAME } = await importConfig();

    expect(AUTH_COOKIE_NAME).toBe('admin_auth_token');
  });

  it('falls back to process.env.APP_NAME when window has no env', async () => {
    process.env.APP_NAME = 'email';
    vi.stubGlobal('window', {});

    const { AUTH_COOKIE_NAME } = await importConfig();

    expect(AUTH_COOKIE_NAME).toBe('email_auth_token');
  });

  it('derives an empty prefix when no APP_NAME is set anywhere', async () => {
    vi.stubGlobal('window', undefined);

    const { AUTH_COOKIE_NAME } = await importConfig();

    expect(AUTH_COOKIE_NAME).toBe('_auth_token');
  });
});
