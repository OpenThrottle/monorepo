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

    it('is true for Ollama (no key required)', () => {
      vi.stubEnv('OLLAMA_BASE_URL', 'http://ollama:11434');
      expect(service.isEmbeddingsConfigured()).toBe(true);
    });
  });
});
