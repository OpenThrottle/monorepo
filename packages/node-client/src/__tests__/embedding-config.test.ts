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
      expect(result.config.spec).toMatchObject({
        kind: 'open-weights',
        ollamaName: 'nomic-embed-text',
      });
    });
  });

  describe('when EMBEDDING_PROVIDER=gemini', () => {
    test('defaults to gemini-embedding-001 at 768 dims with the public API', () => {
      const result = resolveEmbeddingConfig({
        EMBEDDING_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'g-test',
      });

      expect(result.ok).toBe(true);
      if (!result.ok || result.config.provider !== 'gemini') return;
      expect(result.config.model).toBe('gemini-embedding-001');
      expect(result.config.dims).toBe(768);
      expect(result.config.apiKey).toBe('g-test');
      expect(result.config.apiBaseUrl).toBe(
        'https://generativelanguage.googleapis.com/v1beta',
      );
    });

    test('refuses without GEMINI_API_KEY', () => {
      const result = resolveEmbeddingConfig({ EMBEDDING_PROVIDER: 'gemini' });

      expect(result).toMatchObject({ ok: false, reason: 'unconfigured' });
      if (result.ok) return;
      expect(result.detail).toContain('GEMINI_API_KEY');
    });

    test('refuses an OpenAI model', () => {
      const result = resolveEmbeddingConfig({
        EMBEDDING_MODEL: 'text-embedding-3-small',
        EMBEDDING_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'g-test',
      });

      expect(result).toMatchObject({ ok: false, reason: 'unconfigured' });
    });
  });

  describe('when EMBEDDING_PROVIDER=openai', () => {
    test('defaults to text-embedding-3-small at 768 dims with the public API', () => {
      const result = resolveEmbeddingConfig({
        EMBEDDING_PROVIDER: 'openai',
        OPENAI_API_KEY: 'sk-test',
      });

      expect(result.ok).toBe(true);
      if (!result.ok || result.config.provider !== 'openai') return;
      expect(result.config.model).toBe('text-embedding-3-small');
      expect(result.config.dims).toBe(768);
      expect(result.config.apiKey).toBe('sk-test');
      expect(result.config.apiBaseUrl).toBe('https://api.openai.com/v1');
      expect(result.config.spec.documentPrefix).toBe('');
    });

    test('accepts text-embedding-3-large and a trimmed OPENAI_BASE_URL', () => {
      const result = resolveEmbeddingConfig({
        EMBEDDING_MODEL: 'text-embedding-3-large',
        EMBEDDING_PROVIDER: 'openai',
        OPENAI_API_KEY: 'sk-test',
        OPENAI_BASE_URL: 'https://proxy.test/v1/',
      });

      expect(result.ok).toBe(true);
      if (!result.ok || result.config.provider !== 'openai') return;
      expect(result.config.model).toBe('text-embedding-3-large');
      expect(result.config.apiBaseUrl).toBe('https://proxy.test/v1');
    });

    test('refuses without OPENAI_API_KEY', () => {
      const result = resolveEmbeddingConfig({ EMBEDDING_PROVIDER: 'openai' });

      expect(result).toMatchObject({ ok: false, reason: 'unconfigured' });
      if (result.ok) return;
      expect(result.detail).toContain('OPENAI_API_KEY');
    });

    test('refuses the open-weights model', () => {
      const result = resolveEmbeddingConfig({
        EMBEDDING_MODEL: 'nomic-embed-text-v1.5',
        EMBEDDING_PROVIDER: 'openai',
        OPENAI_API_KEY: 'sk-test',
      });

      expect(result).toMatchObject({ ok: false, reason: 'unconfigured' });
      if (result.ok) return;
      expect(result.detail).toContain('text-embedding-3-small');
    });
  });

  describe('when a self-hosted provider is given a hosted model', () => {
    test('refuses it', () => {
      const result = resolveEmbeddingConfig({
        EMBEDDING_MODEL: 'text-embedding-3-small',
        EMBEDDING_PROVIDER: 'ollama',
      });

      expect(result).toMatchObject({ ok: false, reason: 'unconfigured' });
    });
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
