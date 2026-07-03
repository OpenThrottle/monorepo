// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action } from '../roles.$roleId';
import { createTestRouterContext } from '~/testing/router-context';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

describe('routes/roles.$roleId.tsx', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('action', () => {
    test('calls the delete mutation on the deleteRole intent and redirects to /roles', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        deleteRole: { id: 'role-1' },
      });

      const formData = new FormData();
      formData.set('intent', 'deleteRole');

      const request = new Request('http://localhost/roles/role-1', {
        body: formData,
        method: 'POST',
      });

      // 🚨 The action throws the redirect Response; capture it rather than letting it bubble.
      let thrown: unknown;
      try {
        await action({
          context: createTestRouterContext(),
          params: { roleId: 'role-1' },
          pattern: '/roles/:roleId',
          request,
          url: new URL(request.url),
        });
      } catch (error) {
        thrown = error;
      }

      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledTimes(1);
      expect(thrown).toBeInstanceOf(Response);

      if (!(thrown instanceof Response)) {
        throw new Error('Expected the deleteRole action to throw a redirect.');
      }

      expect(thrown.status).toBe(302);
      expect(thrown.headers.get('Location')).toBe('/roles');
    });
  });
});
