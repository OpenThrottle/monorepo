import { beforeEach, describe, expect, test, vi } from 'vitest';

const executeGraphqlWithAuth = vi.fn();

vi.mock('@openthrottle/react-router-graphql', () => {
  class GraphqlAuthError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus: number) {
      super(message);
      this.name = 'GraphqlAuthError';
      this.httpStatus = httpStatus;
    }
  }

  return {
    GraphqlAuthError,
    executeGraphqlWithAuth: (...args: unknown[]) =>
      executeGraphqlWithAuth(...args),
    isAuthError: (error: unknown) => error instanceof GraphqlAuthError,
  };
});

import { GraphqlAuthError } from '@openthrottle/react-router-graphql';
import * as RouteModule from '../permissions._index';

const createArgs = () => {
  const request = new Request('http://localhost/permissions', {
    headers: { cookie: 'ot_auth=token' },
  });

  // The loader under test only reads request from its args.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal loader args stub
  return { request } as any;
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

  test('loader redirects to / when the request is unauthorized (401)', async () => {
    executeGraphqlWithAuth.mockRejectedValueOnce(
      new GraphqlAuthError('Unauthorized', 401),
    );

    const response = await RouteModule.loader(createArgs());

    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) {
      throw new Error('Expected a redirect Response');
    }
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
  });

  test('loader redirects to / when the request is forbidden (403)', async () => {
    executeGraphqlWithAuth.mockRejectedValueOnce(
      new GraphqlAuthError('Forbidden', 403),
    );

    const response = await RouteModule.loader(createArgs());

    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) {
      throw new Error('Expected a redirect Response');
    }
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
  });

  test('loader rethrows non-auth errors', async () => {
    executeGraphqlWithAuth.mockRejectedValueOnce(new Error('boom'));

    await expect(RouteModule.loader(createArgs())).rejects.toThrow('boom');
  });
});
