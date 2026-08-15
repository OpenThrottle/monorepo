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
import * as RouteModule from '../users._index';
import type { Route } from '@/app/routes/+types/users._index';

const createLoaderArgs = () =>
  buildLoaderArgs<Route.LoaderArgs>({
    headers: { cookie: 'ot_auth=token' },
    url: 'http://localhost/users',
  });

const createActionArgs = (body: Record<string, string>) =>
  buildActionArgs<Route.ActionArgs>({
    body,
    headers: { cookie: 'ot_auth=token' },
    url: 'http://localhost/users',
  });

describe('routes/users._index.tsx', () => {
  beforeEach(() => {
    executeGraphqlWithAuth.mockReset();
  });

  describe('loader', () => {
    test('returns users from the GraphQL response', async () => {
      const users = [{ githubUsername: 'visormatt', id: 'user-1' }];
      executeGraphqlWithAuth.mockResolvedValueOnce({ users });

      const result = await RouteModule.loader(createLoaderArgs());

      expect(executeGraphqlWithAuth).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ users });
    });

    test('redirects to / on a 403 auth error', async () => {
      executeGraphqlWithAuth.mockRejectedValueOnce(
        new GraphqlAuthError('Forbidden', 403),
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
    test('creates a user and returns ok on the createUser intent', async () => {
      executeGraphqlWithAuth.mockResolvedValueOnce({});

      const result = await RouteModule.action(
        createActionArgs({
          email: ' user@example.com ',
          githubUsername: ' visormatt ',
          intent: 'createUser',
        }),
      );

      expect(result).toEqual({ ok: true });
      const callArgs = executeGraphqlWithAuth.mock.calls[0];
      expect(callArgs[2]).toEqual({
        input: { email: 'user@example.com', githubUsername: 'visormatt' },
      });
    });

    test('returns an error when the GitHub username is blank', async () => {
      const result = await RouteModule.action(
        createActionArgs({ githubUsername: '   ', intent: 'createUser' }),
      );

      expect(result).toEqual({ error: 'GitHub username is required' });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('returns the error message when the mutation fails', async () => {
      executeGraphqlWithAuth.mockRejectedValueOnce(new Error('already exists'));

      const result = await RouteModule.action(
        createActionArgs({ githubUsername: 'visormatt', intent: 'createUser' }),
      );

      expect(result).toEqual({ error: 'already exists' });
    });

    test('throws on an unknown intent', async () => {
      await expect(
        RouteModule.action(createActionArgs({ intent: 'nope' })),
      ).rejects.toThrow('Invalid intent');
    });
  });
});
