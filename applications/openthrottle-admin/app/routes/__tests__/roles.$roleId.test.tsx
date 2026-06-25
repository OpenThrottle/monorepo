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
import * as RouteModule from '../roles.$roleId';

const createLoaderArgs = (params: Record<string, string>) => {
  const request = new Request('http://localhost/roles/role-1', {
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

  const request = new Request('http://localhost/roles/role-1', {
    body: formData,
    headers: { cookie: 'ot_auth=token' },
    method: 'POST',
  });

  // The action reads request and params from its args.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal action args stub
  return { params, request } as any;
};

describe('routes/roles.$roleId.tsx', () => {
  beforeEach(() => {
    executeGraphqlWithAuth.mockReset();
  });

  describe('loader', () => {
    test('returns the role and permissions', async () => {
      const role = { id: 'role-1', name: 'admin', permissions: [] };
      const permissions = [{ id: 'p1', name: 'users:read' }];
      executeGraphqlWithAuth
        .mockResolvedValueOnce({ role })
        .mockResolvedValueOnce({ permissions });

      const result = await RouteModule.loader(
        createLoaderArgs({ roleId: 'role-1' }),
      );

      expect(result).toEqual({ permissions, role });
    });

    test('returns role null when the role is missing', async () => {
      executeGraphqlWithAuth
        .mockResolvedValueOnce({ role: undefined })
        .mockResolvedValueOnce({ permissions: [] });

      const result = await RouteModule.loader(
        createLoaderArgs({ roleId: 'role-1' }),
      );

      expect(result).toEqual({ permissions: [], role: null });
    });

    test('throws a 404 when roleId is missing', async () => {
      await expect(RouteModule.loader(createLoaderArgs({}))).rejects.toThrow();
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('redirects to / on an auth error', async () => {
      executeGraphqlWithAuth.mockRejectedValue(
        new GraphqlAuthError('Unauthorized', 401),
      );

      const response = await RouteModule.loader(
        createLoaderArgs({ roleId: 'role-1' }),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
    });
  });

  describe('action', () => {
    test('updates the role and returns ok on the updateRole intent', async () => {
      executeGraphqlWithAuth.mockResolvedValueOnce({});

      const result = await RouteModule.action(
        createActionArgs(
          { roleId: 'role-1' },
          { description: 'updated', intent: 'updateRole', name: ' editor ' },
        ),
      );

      expect(result).toEqual({ ok: true });
      const callArgs = executeGraphqlWithAuth.mock.calls[0];
      expect(callArgs[2]).toEqual({
        input: { description: 'updated', id: 'role-1', name: 'editor' },
      });
    });

    test('adds a permission and returns ok', async () => {
      executeGraphqlWithAuth.mockResolvedValueOnce({});

      const result = await RouteModule.action(
        createActionArgs(
          { roleId: 'role-1' },
          { intent: 'addPermission', permissionId: 'p1' },
        ),
      );

      expect(result).toEqual({ ok: true });
    });

    test('calls the delete mutation on the deleteRole intent', async () => {
      executeGraphqlWithAuth.mockResolvedValueOnce({});

      await RouteModule.action(
        createActionArgs({ roleId: 'role-1' }, { intent: 'deleteRole' }),
      );

      expect(executeGraphqlWithAuth).toHaveBeenCalledTimes(1);
      const callArgs = executeGraphqlWithAuth.mock.calls[0];
      expect(callArgs[2]).toEqual({ id: 'role-1' });
    });

    test('returns an error when roleId is missing', async () => {
      const result = await RouteModule.action(
        createActionArgs({}, { intent: 'updateRole', name: 'x' }),
      );

      expect(result).toEqual({ error: 'Role not found' });
    });

    test('returns the error message when a mutation fails', async () => {
      executeGraphqlWithAuth.mockRejectedValueOnce(new Error('nope'));

      const result = await RouteModule.action(
        createActionArgs(
          { roleId: 'role-1' },
          { intent: 'updateRole', name: 'x' },
        ),
      );

      expect(result).toEqual({ error: 'nope' });
    });

    test('throws on an unknown intent', async () => {
      await expect(
        RouteModule.action(
          createActionArgs({ roleId: 'role-1' }, { intent: 'nope' }),
        ),
      ).rejects.toThrow('Invalid intent');
    });
  });
});
