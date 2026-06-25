import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;

  beforeEach(() => {
    // Start from a known-empty provider env so resolution is deterministic.
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('OPENAI_BASE_URL', '');
    vi.stubEnv('OPENAI_EMBEDDING_MODEL', '');
    vi.stubEnv('OLLAMA_BASE_URL', '');
    vi.stubEnv('OLLAMA_EMBEDDING_MODEL', '');
    vi.stubEnv('OLLAMA_VERIFIED_EMBEDDING_MODELS', '');
    service = new AppConfigService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getEmbeddingsConfig', () => {
    it('defaults to OpenAI with default base URL + model and no key', () => {
      expect(service.getEmbeddingsConfig()).toEqual({
        apiKey: undefined,
        baseUrl: 'https://api.openai.com/v1',
        kind: 'openai',
        model: 'text-embedding-3-small',
      });
    });

    it('seeds the OpenAI key, base URL and model from env', () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      vi.stubEnv('OPENAI_BASE_URL', 'https://proxy.example/v1');
      vi.stubEnv('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-large');

      expect(service.getEmbeddingsConfig()).toEqual({
        apiKey: 'sk-test',
        baseUrl: 'https://proxy.example/v1',
        kind: 'openai',
        model: 'text-embedding-3-large',
      });
    });

    it('selects Ollama when OLLAMA_BASE_URL is set', () => {
      vi.stubEnv('OLLAMA_BASE_URL', 'http://ollama:11434');

      expect(service.getEmbeddingsConfig()).toEqual({
        baseUrl: 'http://ollama:11434',
        kind: 'ollama',
        model: 'nomic-embed-text',
      });
    });

    it('selects Ollama when only OLLAMA_EMBEDDING_MODEL is set (default base URL)', () => {
      vi.stubEnv('OLLAMA_EMBEDDING_MODEL', 'mxbai-embed-large');

      expect(service.getEmbeddingsConfig()).toEqual({
        baseUrl: 'http://localhost:11434',
        kind: 'ollama',
        model: 'mxbai-embed-large',
      });
    });
  });

  describe('isEmbeddingsConfigured', () => {
    it('is false for OpenAI without an API key', () => {
      expect(service.isEmbeddingsConfigured()).toBe(false);
    });

    it('is true for OpenAI with an API key', () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      expect(service.isEmbeddingsConfigured()).toBe(true);
    });

    it('is false for Ollama with the default (768-dim) model — not dimension-verified', () => {
      vi.stubEnv('OLLAMA_BASE_URL', 'http://ollama:11434');
      expect(service.isEmbeddingsConfigured()).toBe(false);
    });

    it('is false for an unknown Ollama embedding model', () => {
      vi.stubEnv('OLLAMA_EMBEDDING_MODEL', 'mxbai-embed-large');
      expect(service.isEmbeddingsConfigured()).toBe(false);
    });

    it('flags the mismatched-dim hazard: Ollama resolves to the 768-dim default but is reported unavailable', () => {
      // Selecting Ollama by base URL alone resolves to the default model, which emits 768-dim
      // vectors — narrower than the code_embeddings column (1536). getEmbeddingsConfig still
      // resolves it (so the engine COULD be built), but isEmbeddingsConfigured must report it
      // unavailable so the UI never shows search as ready right up until indexing fails the guard.
      vi.stubEnv('OLLAMA_BASE_URL', 'http://ollama:11434');
      expect(service.getEmbeddingsConfig().model).toBe('nomic-embed-text');
      expect(service.isEmbeddingsConfigured()).toBe(false);
    });

    it('is true for an Ollama model opted in via OLLAMA_VERIFIED_EMBEDDING_MODELS', () => {
      vi.stubEnv('OLLAMA_EMBEDDING_MODEL', 'custom-1536-embed');
      vi.stubEnv(
        'OLLAMA_VERIFIED_EMBEDDING_MODELS',
        'some-other-model, custom-1536-embed',
      );
      expect(service.isEmbeddingsConfigured()).toBe(true);
    });

    it('matches the verified env allowlist case-insensitively', () => {
      vi.stubEnv('OLLAMA_EMBEDDING_MODEL', 'Custom-1536-Embed');
      vi.stubEnv('OLLAMA_VERIFIED_EMBEDDING_MODELS', 'custom-1536-embed');
      expect(service.isEmbeddingsConfigured()).toBe(true);
    });
  });
});
