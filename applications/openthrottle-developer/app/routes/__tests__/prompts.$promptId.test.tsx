import { describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action, loader, meta } from '../prompts.$promptId';
import { CustomPromptType } from '~/__generated__/graphql';

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
        context: {},
        params: { promptId: 'test-id' },
        request,
        unstable_pattern: '/prompts/test-id',
      });

      expect(result).toEqual({ prompt: mockPrompt });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalled();
    });

    test('should throw 400 Response when promptId is missing', async () => {
      const request = new Request('http://localhost/prompts/');

      try {
        await loader({
          context: {},
          // @ts-expect-error - for testing purposes
          params: { promptId: undefined },
          request,
          unstable_pattern: '/prompts/test-id',
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
          context: {},
          params: { promptId: 'not-found' },
          request,
          unstable_pattern: '/prompts/test-id',
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
        context: {},
        params: { promptId: 'test-id' },
        request,
        unstable_pattern: '/prompts/test-id',
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
        context: {},
        // @ts-expect-error - for testing purposes
        params: { promptId: undefined },
        request,
        unstable_pattern: '/prompts/test-id',
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
        context: {},
        params: { promptId: 'test-id' },
        request,
        unstable_pattern: '/prompts/test-id',
      });

      expect((result as Response).status).toBe(302);
    });
  });

  describe('meta', () => {
    test('should return title with prompt name', () => {
      const result = meta({
        data: { prompt: mockPrompt },
        error: undefined,
        loaderData: undefined,
        location: {
          hash: '',
          key: '',
          pathname: '',
          search: '',
          state: {},
          unstable_mask: undefined,
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
