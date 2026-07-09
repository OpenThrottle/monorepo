import { beforeEach, describe, expect, test, vi } from 'vitest';

const executeGraphqlWithAuth = vi.fn();

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: (...args: unknown[]) =>
    executeGraphqlWithAuth(...args),
}));

import { createActionArgs } from '@openthrottle/react-router-testing';

import * as RouteModule from '../auth.logout';
import type { Route } from '@/app/routes/+types/auth.logout';

// The loader and action under test only need a request (both use POST here).
const createArgs = <T extends Route.LoaderArgs | Route.ActionArgs>() =>
  createActionArgs<T>({
    headers: { cookie: 'ot_auth=token' },
    url: 'http://localhost/auth/logout',
  });

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
