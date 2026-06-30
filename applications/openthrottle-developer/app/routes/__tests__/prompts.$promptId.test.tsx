import { describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action, loader, meta } from '../prompts.$promptId';
import { CustomPromptType } from '~/__generated__/graphql';
import { createTestRouterContext } from '~/testing/router-context';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

describe('routes/prompts.$promptId.tsx', () => {
  const mockPrompt = {
    content: '# Test Prompt',
    createdAt: '2024-01-01T00:00:00Z',
    description: 'A test prompt',
    filePath: '.cursor/rules/test.mdc',
    id: 'test-id',
    labels: ['test'],
    projectId: null,
    promptType: CustomPromptType.Prompts,
    title: 'Test Prompt',
    updatedAt: '2024-01-01T00:00:00Z',
    userId: 'user-id',
  };

  describe('loader', () => {
    test('should load a prompt by ID', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        customPrompt: mockPrompt,
      });

      const request = new Request('http://localhost/prompts/test-id');
      const result = await loader({
        context: createTestRouterContext(),
        params: { promptId: 'test-id' },
        pattern: '/prompts/test-id',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ prompt: mockPrompt });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalled();
    });

    test('should throw 400 Response when promptId is missing', async () => {
      const request = new Request('http://localhost/prompts/');

      try {
        await loader({
          context: createTestRouterContext(),
          // @ts-expect-error - for testing purposes
          params: { promptId: undefined },
          pattern: '/prompts/test-id',
          request,
          url: new URL(request.url),
        });
        expect.fail('Expected loader to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        expect((error as Response).status).toBe(400);
      }
    });

    test('should throw 404 Response when prompt not found', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({ customPrompt: null });

      const request = new Request('http://localhost/prompts/not-found');

      try {
        await loader({
          context: createTestRouterContext(),
          params: { promptId: 'not-found' },
          pattern: '/prompts/test-id',
          request,
          url: new URL(request.url),
        });
        expect.fail('Expected loader to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        expect((error as Response).status).toBe(404);
      }
    });
  });

  describe('action', () => {
    test('should update prompt content', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        updateCustomPrompt: mockPrompt,
      });

      const formData = new FormData();
      formData.set('intent', 'update');
      formData.set('content', '# Updated content');

      const request = new Request('http://localhost/prompts/test-id', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: { promptId: 'test-id' },
        pattern: '/prompts/test-id',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ success: true });
    });

    test('should return error when promptId is missing', async () => {
      const formData = new FormData();
      formData.set('intent', 'update');
      formData.set('content', '# Content');

      const request = new Request('http://localhost/prompts/', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        // @ts-expect-error - for testing purposes
        params: { promptId: undefined },
        pattern: '/prompts/test-id',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ error: 'Missing prompt id.' });
    });

    test('should delete prompt and redirect', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        deleteCustomPrompt: true,
      });

      const formData = new FormData();
      formData.set('intent', 'delete');

      const request = new Request('http://localhost/prompts/test-id', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: { promptId: 'test-id' },
        pattern: '/prompts/test-id',
        request,
        url: new URL(request.url),
      });

      expect((result as Response).status).toBe(302);
    });
  });

  describe('meta', () => {
    test('should return title with prompt name', () => {
      const result = meta({
        error: undefined,
        loaderData: { prompt: mockPrompt },
        location: {
          hash: '',
          key: '',
          mask: undefined,
          pathname: '',
          search: '',
          state: {},
        },
        matches: [] as unknown as any,
        params: { promptId: 'test-id' },
      });

      expect(result).toContainEqual({
        title: expect.stringContaining('Test Prompt'),
      });
    });
  });
});
