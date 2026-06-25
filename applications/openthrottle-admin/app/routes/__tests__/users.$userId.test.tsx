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
import * as RouteModule from '../users.$userId';

const createLoaderArgs = (params: Record<string, string>) => {
  const request = new Request('http://localhost/users/user-1', {
    headers: { cookie: 'ot_auth=token' },
  });

  // The loader reads request and params from its args.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal loader args stub
  return { params, request } as any;
};

const createActionArgs = (
  params: Record<string, string>,
  body: Record<string, string>,
) => {
  const formData = new FormData();
  Object.entries(body).forEach(([key, value]) => formData.append(key, value));

  const request = new Request('http://localhost/users/user-1', {
    body: formData,
    headers: { cookie: 'ot_auth=token' },
    method: 'POST',
  });

  // The action reads request and params from its args.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal action args stub
  return { params, request } as any;
};

describe('routes/users.$userId.tsx', () => {
  beforeEach(() => {
    executeGraphqlWithAuth.mockReset();
  });

  describe('loader', () => {
    test('returns the user, roles for user, and roles list', async () => {
      const user = { githubUsername: 'visormatt', id: 'user-1' };
      const rolesForUser = [{ id: 'role-1', name: 'admin' }];
      const roles = [{ id: 'role-2', name: 'editor' }];
      executeGraphqlWithAuth
        .mockResolvedValueOnce({ user })
        .mockResolvedValueOnce({ rolesForUser })
        .mockResolvedValueOnce({ roles });

      const result = await RouteModule.loader(
        createLoaderArgs({ userId: 'user-1' }),
      );

      expect(result).toEqual({ rolesForUser, rolesList: roles, user });
    });

    test('returns user null when the user is missing', async () => {
      executeGraphqlWithAuth
        .mockResolvedValueOnce({ user: undefined })
        .mockResolvedValueOnce({ rolesForUser: [] })
        .mockResolvedValueOnce({ roles: [] });

      const result = await RouteModule.loader(
        createLoaderArgs({ userId: 'user-1' }),
      );

      expect(result).toEqual({ rolesForUser: [], rolesList: [], user: null });
    });

    test('throws a 404 when userId is missing', async () => {
      await expect(RouteModule.loader(createLoaderArgs({}))).rejects.toThrow();
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('redirects to / on an auth error', async () => {
      executeGraphqlWithAuth.mockRejectedValue(
        new GraphqlAuthError('Forbidden', 403),
      );

      const response = await RouteModule.loader(
        createLoaderArgs({ userId: 'user-1' }),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
    });
  });

  describe('action', () => {
    test('updates the user and returns ok on the updateUser intent', async () => {
      executeGraphqlWithAuth.mockResolvedValueOnce({});

      const result = await RouteModule.action(
        createActionArgs(
          { userId: 'user-1' },
          {
            email: ' new@example.com ',
            githubUsername: ' newname ',
            intent: 'updateUser',
          },
        ),
      );

      expect(result).toEqual({ ok: true });
      const callArgs = executeGraphqlWithAuth.mock.calls[0];
      expect(callArgs[2]).toEqual({
        input: {
          email: 'new@example.com',
          githubUsername: 'newname',
          id: 'user-1',
        },
      });
    });

    test('assigns a role and returns ok', async () => {
      executeGraphqlWithAuth.mockResolvedValueOnce({});

      const result = await RouteModule.action(
        createActionArgs(
          { userId: 'user-1' },
          { intent: 'assignRole', roleId: 'role-1' },
        ),
      );

      expect(result).toEqual({ ok: true });
    });

    test('disables a user and returns ok', async () => {
      executeGraphqlWithAuth.mockResolvedValueOnce({});

      const result = await RouteModule.action(
        createActionArgs({ userId: 'user-1' }, { intent: 'disableUser' }),
      );

      expect(result).toEqual({ ok: true });
    });

    test('returns an error when userId is missing', async () => {
      const result = await RouteModule.action(
        createActionArgs({}, { intent: 'disableUser' }),
      );

      expect(result).toEqual({ error: 'User not found' });
    });

    test('returns the error message when a mutation fails', async () => {
      executeGraphqlWithAuth.mockRejectedValueOnce(new Error('nope'));

      const result = await RouteModule.action(
        createActionArgs({ userId: 'user-1' }, { intent: 'disableUser' }),
      );

      expect(result).toEqual({ error: 'nope' });
    });

    test('throws on an unknown intent', async () => {
      await expect(
        RouteModule.action(
          createActionArgs({ userId: 'user-1' }, { intent: 'nope' }),
        ),
      ).rejects.toThrow('Invalid intent');
    });
  });
});
