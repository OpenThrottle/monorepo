// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { action } from '../plans.upload-decompose';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

describe('routes/plans.upload-decompose.tsx', () => {
  describe('action', () => {
    test('parse returns error when no file is uploaded', async () => {
      const formData = new FormData();
      formData.set('intent', 'parse');

      const request = new Request('http://localhost/plans/upload-decompose', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/plans/upload-decompose',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({
        error: 'Choose a non-empty file.',
        proposal: undefined,
      });
    });

    test('parse returns a stub proposal for a valid file', async () => {
      const file = new File(['# Plan'], 'roadmap.md', {
        type: 'text/markdown',
      });
      const formData = new FormData();
      formData.set('intent', 'parse');
      formData.set('document', file);

      const request = new Request('http://localhost/plans/upload-decompose', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/plans/upload-decompose',
        request,
        url: new URL(request.url),
      });

      expect(result.error).toBeUndefined();
      expect(result.proposal?.planTitle).toBe('Imported: roadmap.md');
      expect(result.proposal?.tasks).toHaveLength(2);
    });

    test('commit returns error when proposal payload is missing', async () => {
      const formData = new FormData();
      formData.set('intent', 'commit');

      const request = new Request('http://localhost/plans/upload-decompose', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/plans/upload-decompose',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({
        error: 'Missing proposal payload.',
        proposal: undefined,
      });
    });

    test('returns error for unknown intent', async () => {
      const formData = new FormData();
      formData.set('intent', 'unknown');

      const request = new Request('http://localhost/plans/upload-decompose', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/plans/upload-decompose',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ error: 'Unknown action.', proposal: undefined });
    });
  });
});
