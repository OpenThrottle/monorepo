// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action } from '../plans.create';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

/** Narrows an action result to a `Response`, failing the test otherwise. */
function assertResponse(value: unknown): asserts value is Response {
  expect(value).toBeInstanceOf(Response);
}

describe('routes/plans.create.tsx', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('action', () => {
    test('returns error when category is missing', async () => {
      const formData = new FormData();
      formData.set('title', 'New plan');

      const request = new Request('http://localhost/plans/create', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/plans/create',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ error: 'Category is required.' });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('returns error when title is missing', async () => {
      const formData = new FormData();
      formData.set('category', 'feature');

      const request = new Request('http://localhost/plans/create', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/plans/create',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ error: 'Title is required.' });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('creates a plan and redirects', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        createPlan: { id: 'plan-new' },
      });

      const formData = new FormData();
      formData.set('author', 'visormatt');
      formData.set('category', 'feature');
      formData.set('title', 'New plan');

      const request = new Request('http://localhost/plans/create', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/plans/create',
        request,
        url: new URL(request.url),
      });

      assertResponse(result);
      expect(result.status).toBe(302);
    });
  });
});
