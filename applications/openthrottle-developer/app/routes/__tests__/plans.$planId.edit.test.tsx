// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action, loader } from '../plans.$planId.edit';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

describe('routes/plans.$planId.edit.tsx', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('loader', () => {
    test('returns null plan when planId is missing', async () => {
      const result = await loader({
        context: createTestRouterContext(),
        params: { planId: '' },
        pattern: '/plans/:planId/edit',
        request: new Request('http://localhost/plans//edit'),
        url: new URL('http://localhost/plans//edit'),
      });

      expect(result).toEqual({ plan: null });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('loads plan by id', async () => {
      const mockPlan = {
        __typename: 'PlanObject' as const,
        author: 'visormatt',
        category: 'feature',
        id: 'plan-1',
        title: 'Test Plan',
      };

      mockExecuteGraphqlWithAuth.mockResolvedValue({ plan: mockPlan });

      const result = await loader({
        context: createTestRouterContext(),
        params: { planId: 'plan-1' },
        pattern: '/plans/:planId/edit',
        request: new Request('http://localhost/plans/plan-1/edit'),
        url: new URL('http://localhost/plans/plan-1/edit'),
      });

      expect(result).toEqual({ plan: mockPlan });
    });
  });

  describe('action', () => {
    test('returns error when plan id does not match route', async () => {
      const formData = new FormData();
      formData.set('author', 'visormatt');
      formData.set('category', 'feature');
      formData.set('id', 'other-plan');
      formData.set('title', 'Updated plan');

      const request = new Request('http://localhost/plans/plan-1/edit', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: { planId: 'plan-1' },
        pattern: '/plans/:planId/edit',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ error: 'Plan id does not match.' });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('updates plan and redirects', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        updatePlan: { id: 'plan-1' },
      });

      const formData = new FormData();
      formData.set('author', 'visormatt');
      formData.set('category', 'feature');
      formData.set('id', 'plan-1');
      formData.set('title', 'Updated plan');

      const request = new Request('http://localhost/plans/plan-1/edit', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: { planId: 'plan-1' },
        pattern: '/plans/:planId/edit',
        request,
        url: new URL(request.url),
      });

      expect((result as Response).status).toBe(302);
    });
  });
});
