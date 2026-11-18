import { beforeEach, describe, expect, test, vi } from 'vitest';

const executeGraphqlWithAuth = vi.fn();

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();

  return {
    ...actual,
    executeGraphqlWithAuth: (...args: unknown[]) =>
      executeGraphqlWithAuth(...args),
  };
});

import { GraphqlAuthError } from '@openthrottle/react-router-graphql';
import { createLoaderArgs } from '@openthrottle/react-router-testing';

import type { Route } from '@/app/routes/+types/permissions._index';

import * as RouteModule from '../permissions._index';

const createArgs = () => {
  return createLoaderArgs<Route.LoaderArgs>({
    headers: { cookie: 'ot_auth=token' },
    url: 'http://localhost/permissions',
  });
};

describe('routes/permissions._index.tsx', () => {
  beforeEach(() => {
    executeGraphqlWithAuth.mockReset();
  });

  test('exports default component and meta', () => {
    expect(typeof RouteModule.default).toBe('function');
    expect(typeof RouteModule.meta).toBe('function');
  });

  test('exports loader', () => {
    expect(typeof RouteModule.loader).toBe('function');
  });

  test('loader returns the permissions from the GraphQL response', async () => {
    const permissions = [
      {
        __typename: 'PermissionObject',
        description: null,
        id: 'p1',
        name: 'users:read',
      },
    ];
    executeGraphqlWithAuth.mockResolvedValueOnce({ permissions });

    const result = await RouteModule.loader(createArgs());

    expect(executeGraphqlWithAuth).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ permissions });
  });

  test('loader redirects to /auth with redirectUrl, clearing the cookie, when the request is unauthorized (401)', async () => {
    executeGraphqlWithAuth.mockRejectedValueOnce(
      new GraphqlAuthError('Unauthorized', 401),
    );

    const response = await RouteModule.loader(createArgs()).catch(
      (thrown: unknown) => thrown,
    );

    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) {
      throw new Error('Expected a redirect Response');
    }
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(
      '/auth?redirectUrl=%2Fpermissions',
    );
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  test('loader redirects to /auth with redirectUrl, clearing the cookie, when the request is forbidden (403)', async () => {
    executeGraphqlWithAuth.mockRejectedValueOnce(
      new GraphqlAuthError('Forbidden', 403),
    );

    const response = await RouteModule.loader(createArgs()).catch(
      (thrown: unknown) => thrown,
    );

    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) {
      throw new Error('Expected a redirect Response');
    }
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(
      '/auth?redirectUrl=%2Fpermissions',
    );
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  test('loader rethrows non-auth errors', async () => {
    executeGraphqlWithAuth.mockRejectedValueOnce(new Error('boom'));

    await expect(RouteModule.loader(createArgs())).rejects.toThrow('boom');
  });
});
