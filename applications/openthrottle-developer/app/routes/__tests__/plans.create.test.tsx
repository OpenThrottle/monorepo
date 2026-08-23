// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action, loader } from '../plans.create';
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

  describe('loader', () => {
    const loaderArgs = () => {
      const request = new Request('http://localhost/plans/create');

      return {
        context: createTestRouterContext(),
        params: {},
        pattern: '/plans/create' as const,
        request,
        url: new URL(request.url),
      };
    };

    test('returns the enabled editors and checkout roots from workspace settings', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        workspaceSettings: {
          localRepositories: [
            {
              displayName: 'openthrottle',
              filesystemPath: '/srv/checkouts/openthrottle',
              id: 'repo-1',
            },
          ],
          profile: { enabledEditors: ['CURSOR'] },
        },
      });

      const result = await loader(loaderArgs());

      expect(result).toEqual({
        editors: ['CURSOR'],
        repositories: [
          {
            displayName: 'openthrottle',
            filesystemPath: '/srv/checkouts/openthrottle',
            id: 'repo-1',
          },
        ],
      });
    });

    test('degrades to no editor links when workspace settings fail', async () => {
      mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('unauthorized'));

      const result = await loader(loaderArgs());

      expect(result).toEqual({ editors: [], repositories: [] });
    });
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

      expect(result).toMatchObject({
        error: 'Category is required.',
        field: 'category',
      });
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

      expect(result).toMatchObject({
        error: 'Title is required.',
        field: 'title',
      });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('echoes submitted values back so the form can repopulate', async () => {
      const formData = new FormData();
      formData.set('summary', 'Short summary text');
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

      expect(result).toMatchObject({
        values: {
          category: '',
          summary: 'Short summary text',
          title: 'New plan',
        },
      });
    });

    test('anchors the server author error to the author field', async () => {
      mockExecuteGraphqlWithAuth.mockRejectedValue(
        new Error('author is required when GITHUB_USER is not set.'),
      );

      const formData = new FormData();
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

      expect(result).toMatchObject({
        error: 'author is required when GITHUB_USER is not set.',
        field: 'author',
        values: { category: 'feature', title: 'New plan' },
      });
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
