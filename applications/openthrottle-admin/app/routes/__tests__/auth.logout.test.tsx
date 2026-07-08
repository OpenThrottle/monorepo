import { beforeEach, describe, expect, test, vi } from 'vitest';

const executeGraphqlWithAuth = vi.fn();

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: (...args: unknown[]) =>
    executeGraphqlWithAuth(...args),
}));

import * as RouteModule from '../auth.logout';
import type { Route } from '@/app/routes/+types/auth.logout';

// createArgs only needs request for the loader/action under test.
const createArgs = <T extends Route.LoaderArgs | Route.ActionArgs>() => {
  const request = new Request('http://localhost/auth/logout', {
    headers: { cookie: 'ot_auth=token' },
    method: 'POST',
  });

  return { request } as unknown as T;
};

describe('routes/auth.logout.tsx', () => {
  beforeEach(() => {
    executeGraphqlWithAuth.mockReset();
    executeGraphqlWithAuth.mockResolvedValue({});
  });

  test('loader signs out, clears the auth cookie, and redirects to index', async () => {
    const response = await RouteModule.loader(createArgs<Route.LoaderArgs>());

    expect(executeGraphqlWithAuth).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  test('action signs out, clears the auth cookie, and redirects to index', async () => {
    const response = await RouteModule.action(createArgs<Route.ActionArgs>());

    expect(executeGraphqlWithAuth).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  test('still clears the cookie and redirects when server signout fails', async () => {
    executeGraphqlWithAuth.mockRejectedValueOnce(new Error('token invalid'));

    const response = await RouteModule.loader(createArgs<Route.LoaderArgs>());

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});
