import { describe, expect, test } from 'vitest';

import { resolveEmbeddingConfig } from '../embedding-config.ts';

describe('resolveEmbeddingConfig', () => {
  describe('when nothing is set', () => {
    test('defaults to the local provider, nomic-embed-text-v1.5 and 768 dims', () => {
      const result = resolveEmbeddingConfig({});

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.provider).toBe('local');
      expect(result.config.model).toBe('nomic-embed-text-v1.5');
      expect(result.config.dims).toBe(768);
      expect(result.config.modelsDir).toMatch(/\.openthrottle[/\\]models$/);
    });
  });

  describe('when EMBEDDING_PROVIDER=ollama', () => {
    test('selects ollama with the same model and a trimmed base URL', () => {
      const result = resolveEmbeddingConfig({
        EMBEDDING_PROVIDER: 'Ollama',
        OLLAMA_BASE_URL: 'https://ollama.local/',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.config.provider).toBe('ollama');
      expect(result.config.ollamaBaseUrl).toBe('https://ollama.local');
      expect(result.config.spec.ollamaName).toBe('nomic-embed-text');
    });
  });

  describe('when EMBEDDING_PROVIDER is reserved', () => {
    test.each(['openai', 'gemini'])(
      'refuses %s as not implemented',
      (provider) => {
        const result = resolveEmbeddingConfig({ EMBEDDING_PROVIDER: provider });

        expect(result).toMatchObject({
          ok: false,
          provider,
          reason: 'unconfigured',
        });
        if (result.ok) return;
        expect(result.detail).toContain('not implemented');
      },
    );
  });

  describe('when EMBEDDING_PROVIDER is unknown', () => {
    test('refuses it', () => {
      const result = resolveEmbeddingConfig({ EMBEDDING_PROVIDER: 'cohere' });

      expect(result).toMatchObject({ ok: false, reason: 'unconfigured' });
      if (result.ok) return;
      expect(result.detail).toContain('unknown');
    });
  });

  describe('when EMBEDDING_MODEL is unsupported', () => {
    test('refuses it rather than guessing its prefixes', () => {
      const result = resolveEmbeddingConfig({
        EMBEDDING_MODEL: 'mxbai-embed-large',
      });

      expect(result).toMatchObject({ ok: false, reason: 'unconfigured' });
    });
  });

  describe('when EMBEDDING_DIMS disagrees with the model', () => {
    test('refuses the config', () => {
      const result = resolveEmbeddingConfig({ EMBEDDING_DIMS: '1536' });

      expect(result).toMatchObject({ ok: false, reason: 'unconfigured' });
      if (result.ok) return;
      expect(result.detail).toContain('768');
    });
  });

  describe('when EMBEDDING_MODELS_DIR is set', () => {
    test('uses it', () => {
      const result = resolveEmbeddingConfig({
        EMBEDDING_MODELS_DIR: '/models',
      });

      expect(result.ok && result.config.modelsDir).toBe('/models');
    });
  });
});
