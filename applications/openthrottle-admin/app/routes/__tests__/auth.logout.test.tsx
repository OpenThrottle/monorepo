import { beforeEach, describe, expect, test, vi } from 'vitest';

const executeGraphqlWithAuth = vi.fn();

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: (...args: unknown[]) =>
    executeGraphqlWithAuth(...args),
}));

import * as RouteModule from '../auth.logout';

const createArgs = () => {
  const request = new Request('http://localhost/auth/logout', {
    headers: { cookie: 'ot_auth=token' },
    method: 'POST',
  });

  // createArgs only needs request for the loader/action under test
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal loader/action args stub
  return { request } as any;
};

describe('routes/auth.logout.tsx', () => {
  beforeEach(() => {
    executeGraphqlWithAuth.mockReset();
    executeGraphqlWithAuth.mockResolvedValue({});
  });

  test('loader signs out, clears the auth cookie, and redirects to index', async () => {
    const response = await RouteModule.loader(createArgs());

    expect(executeGraphqlWithAuth).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  test('action signs out, clears the auth cookie, and redirects to index', async () => {
    const response = await RouteModule.action(createArgs());

    expect(executeGraphqlWithAuth).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  test('still clears the cookie and redirects when server signout fails', async () => {
    executeGraphqlWithAuth.mockRejectedValueOnce(new Error('token invalid'));

    const response = await RouteModule.loader(createArgs());

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});
