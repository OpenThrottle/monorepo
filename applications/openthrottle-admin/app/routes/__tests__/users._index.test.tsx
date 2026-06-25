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
import * as RouteModule from '../users._index';

const createLoaderArgs = () => {
  const request = new Request('http://localhost/users', {
    headers: { cookie: 'ot_auth=token' },
  });

  // The loader only reads request from its args.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal loader args stub
  return { request } as any;
};

const createActionArgs = (body: Record<string, string>) => {
  const formData = new FormData();
  Object.entries(body).forEach(([key, value]) => formData.append(key, value));

  const request = new Request('http://localhost/users', {
    body: formData,
    headers: { cookie: 'ot_auth=token' },
    method: 'POST',
  });

  // The action only reads request from its args.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal action args stub
  return { request } as any;
};

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
