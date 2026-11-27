import { afterEach, describe, expect, test, vi } from 'vitest';

import { getApiBaseUrl, getRequestAuthToken } from '../api-request';

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('strips the /graphql suffix and any trailing slash', () => {
    vi.stubEnv('API_URL_INTERNAL', 'http://localhost:6021/');

    expect(getApiBaseUrl()).toBe('http://localhost:6021');
  });

  test('throws when API_URL_INTERNAL is unset', () => {
    vi.stubEnv('API_URL_INTERNAL', '');

    expect(() => getApiBaseUrl()).toThrow('API_URL_INTERNAL is not set');
  });
});

describe('getRequestAuthToken', () => {
  test('reads the token from the auth cookie', async () => {
    const { AUTH_COOKIE_NAME } =
      await import('@openthrottle/react-router-auth');
    const request = new Request('http://localhost/', {
      headers: { cookie: `other=1; ${AUTH_COOKIE_NAME}=abc.def` },
    });

    expect(getRequestAuthToken(request)).toBe('abc.def');
  });

  test('is null without a cookie', () => {
    expect(getRequestAuthToken(new Request('http://localhost/'))).toBeNull();
  });
});
