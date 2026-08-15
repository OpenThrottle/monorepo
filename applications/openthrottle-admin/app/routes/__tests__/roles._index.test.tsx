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

import {
  createActionArgs as buildActionArgs,
  createLoaderArgs as buildLoaderArgs,
} from '@openthrottle/react-router-testing';

import { GraphqlAuthError } from '@openthrottle/react-router-graphql';
import * as RouteModule from '../roles._index';
import type { Route } from '@/app/routes/+types/roles._index';

const createLoaderArgs = () =>
  buildLoaderArgs<Route.LoaderArgs>({
    headers: { cookie: 'ot_auth=token' },
    url: 'http://localhost/roles',
  });

const createActionArgs = (body: Record<string, string>) =>
  buildActionArgs<Route.ActionArgs>({
    body,
    headers: { cookie: 'ot_auth=token' },
    url: 'http://localhost/roles',
  });

describe('routes/roles._index.tsx', () => {
  beforeEach(() => {
    executeGraphqlWithAuth.mockReset();
  });

  describe('loader', () => {
    test('returns roles from the GraphQL response', async () => {
      const roles = [{ id: 'role-1', name: 'admin' }];
      executeGraphqlWithAuth.mockResolvedValueOnce({ roles });

      const result = await RouteModule.loader(createLoaderArgs());

      expect(executeGraphqlWithAuth).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ roles });
    });

    test('redirects to / on a 401 auth error', async () => {
      executeGraphqlWithAuth.mockRejectedValueOnce(
        new GraphqlAuthError('Unauthorized', 401),
      );

      const response = await RouteModule.loader(createLoaderArgs());

      expect(response).toBeInstanceOf(Response);
      if (!(response instanceof Response)) {
        throw new Error('Expected a redirect Response');
      }
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
    });

    test('rethrows non-auth errors', async () => {
      executeGraphqlWithAuth.mockRejectedValueOnce(new Error('boom'));

      await expect(RouteModule.loader(createLoaderArgs())).rejects.toThrow(
        'boom',
      );
    });
  });

  describe('action', () => {
    test('creates a role and returns ok on the createRole intent', async () => {
      executeGraphqlWithAuth.mockResolvedValueOnce({});

      const result = await RouteModule.action(
        createActionArgs({
          description: ' an admin ',
          intent: 'createRole',
          name: ' admin ',
        }),
      );

      expect(result).toEqual({ ok: true });
      const callArgs = executeGraphqlWithAuth.mock.calls[0];
      expect(callArgs[2]).toEqual({
        input: { description: 'an admin', name: 'admin' },
      });
    });

    test('returns an error when the role name is blank', async () => {
      const result = await RouteModule.action(
        createActionArgs({ intent: 'createRole', name: '   ' }),
      );

      expect(result).toEqual({ error: 'Role name is required' });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('returns the error message when the mutation fails', async () => {
      executeGraphqlWithAuth.mockRejectedValueOnce(new Error('duplicate name'));

      const result = await RouteModule.action(
        createActionArgs({ intent: 'createRole', name: 'admin' }),
      );

      expect(result).toEqual({ error: 'duplicate name' });
    });

    test('throws on an unknown intent', async () => {
      await expect(
        RouteModule.action(createActionArgs({ intent: 'nope' })),
      ).rejects.toThrow('Invalid intent');
    });
  });
});
