import { describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action, meta } from '../prompts.create';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { buildRootMatch } from '~/testing/root-match-fixture';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

function assertInstanceOf<T>(
  value: unknown,
  ctor: new (...args: never[]) => T,
): asserts value is T {
  expect(value).toBeInstanceOf(ctor);
}

describe('routes/prompts.create.tsx', () => {
  const mockCreatedPrompt = {
    content: '# New Prompt',
    createdAt: '2024-01-01T00:00:00Z',
    description: 'A new prompt',
    filePath: null,
    id: 'new-id',
    labels: [],
    promptType: 'PROMPTS',
    title: 'New Prompt',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  describe('action', () => {
    test('should create a new prompt and redirect', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        createCustomPrompt: mockCreatedPrompt,
      });

      const formData = new FormData();
      formData.set('title', 'New Prompt');
      formData.set('content', '# New Prompt');
      formData.set('promptType', 'prompts');

      const request = new Request('http://localhost/prompts/create', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/prompts/create',
        request,
        url: new URL(request.url),
      });

      assertInstanceOf(result, Response);
      expect(result.status).toBe(302);
    });

    test('should return error when title is missing', async () => {
      const formData = new FormData();
      formData.set('content', '# Content');
      formData.set('promptType', 'prompts');

      const request = new Request('http://localhost/prompts/create', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/prompts/create',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ error: 'Title is required.' });
    });

    test('should return error when content is missing', async () => {
      const formData = new FormData();
      formData.set('title', 'New Prompt');
      formData.set('promptType', 'prompts');

      const request = new Request('http://localhost/prompts/create', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/prompts/create',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ error: 'Content is required.' });
    });

    test('should parse labels from comma-separated string', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        createCustomPrompt: mockCreatedPrompt,
      });

      const formData = new FormData();
      formData.set('title', 'New Prompt');
      formData.set('content', '# New Prompt');
      formData.set('promptType', 'prompts');
      formData.set('labels', 'coding, typescript, react');

      const request = new Request('http://localhost/prompts/create', {
        body: formData,
        method: 'POST',
      });

      await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/prompts/create',
        request,
        url: new URL(request.url),
      });

      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          input: expect.objectContaining({
            labels: ['coding', 'typescript', 'react'],
          }),
        }),
      );
    });
  });

  describe('meta', () => {
    test('should return correct title', () => {
      const result = meta({
        error: undefined,
        loaderData: undefined,
        location: {
          hash: '',
          key: '',
          mask: undefined,
          pathname: '',
          search: '',
          state: {},
        },
        matches: [
          { ...buildRootMatch(), meta: [] },
          {
            handle: undefined,
            id: 'routes/prompts.create',
            loaderData: {},
            meta: [],
            params: {},
            pathname: '/',
          },
        ],
        params: {},
      });

      expect(result).toContainEqual({
        title: expect.stringContaining('Create Prompt'),
      });
    });
  });
});
