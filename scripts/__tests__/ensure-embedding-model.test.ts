import { describe, expect, test, vi } from 'vitest';

import type {
  FetchModelFilesResult,
  VerifyEmbedderResult,
} from '../embedding-model.ts';
import {
  ensureEmbeddingModel,
  formatMissingModelWarning,
} from '../ensure-embedding-model.ts';

const verified: VerifyEmbedderResult = {
  dims: 768,
  model: 'nomic-embed-text-v1.5',
  ok: true,
};

const fetchedWith = (downloaded: number): FetchModelFilesResult => {
  return { cached: 5 - downloaded, downloaded, ok: true };
};

describe('ensureEmbeddingModel', () => {
  describe('when EMBEDDING_PROVIDER is not local', () => {
    test.each(['ollama', 'openai', 'Gemini'])(
      'skips %s without touching the cache',
      async (provider) => {
        const fetchFiles = vi.fn();
        const verify = vi.fn();

        const outcome = await ensureEmbeddingModel({
          env: { EMBEDDING_PROVIDER: provider },
          fetchFiles,
          verify,
        });

        expect(outcome).toEqual({
          kind: 'skipped',
          provider: provider.toLowerCase(),
        });
        expect(fetchFiles).not.toHaveBeenCalled();
        expect(verify).not.toHaveBeenCalled();
      },
    );
  });

  describe('when every file is already cached', () => {
    test('reports cached and never loads the embedder', async () => {
      const verify = vi.fn();

      const outcome = await ensureEmbeddingModel({
        env: { EMBEDDING_MODELS_DIR: '/models' },
        fetchFiles: async () => {
          return fetchedWith(0);
        },
        verify,
      });

      expect(outcome).toEqual({ kind: 'cached', root: '/models' });
      expect(verify).not.toHaveBeenCalled();
    });

    test('treats a blank provider as local', async () => {
      const fetchFiles = vi.fn(async () => {
        return fetchedWith(0);
      });

      await ensureEmbeddingModel({
        env: { EMBEDDING_MODELS_DIR: '/models', EMBEDDING_PROVIDER: ' ' },
        fetchFiles,
        verify: vi.fn(),
      });

      expect(fetchFiles).toHaveBeenCalledWith('/models');
    });
  });

  describe('when files were downloaded', () => {
    test('verifies the embedder once and reports downloaded', async () => {
      const verify = vi.fn(async () => {
        return verified;
      });

      const outcome = await ensureEmbeddingModel({
        env: { EMBEDDING_MODELS_DIR: '/models' },
        fetchFiles: async () => {
          return fetchedWith(2);
        },
        verify,
      });

      expect(outcome).toEqual({
        downloaded: 2,
        kind: 'downloaded',
        root: '/models',
      });
      expect(verify).toHaveBeenCalledTimes(1);
    });

    test('fails when the downloaded model will not load', async () => {
      const outcome = await ensureEmbeddingModel({
        env: { EMBEDDING_MODELS_DIR: '/models' },
        fetchFiles: async () => {
          return fetchedWith(5);
        },
        verify: async () => {
          return { ok: false, reason: 'onnxruntime missing' };
        },
      });

      expect(outcome.kind).toBe('failed');
      expect(outcome).toHaveProperty(
        'reason',
        expect.stringContaining('onnxruntime missing'),
      );
    });
  });

  describe('when the fetch fails', () => {
    test('reports failed with the reason instead of throwing', async () => {
      const verify = vi.fn();

      const outcome = await ensureEmbeddingModel({
        env: { EMBEDDING_MODELS_DIR: '/models' },
        fetchFiles: async () => {
          return { ok: false, reason: 'fetch failed: ENOTFOUND' };
        },
        verify,
      });

      expect(outcome).toEqual({
        kind: 'failed',
        reason: 'fetch failed: ENOTFOUND',
        root: '/models',
      });
      expect(verify).not.toHaveBeenCalled();
    });
  });
});

describe('formatMissingModelWarning', () => {
  test('names the reason, the cache and the manual fix', () => {
    const lines = formatMissingModelWarning({
      kind: 'failed',
      reason: 'fetch failed',
      root: '/models',
    }).join('\n');

    expect(lines).toContain('fetch failed');
    expect(lines).toContain('/models');
    expect(lines).toContain('pnpm run embeddings:download-model');
  });
});
