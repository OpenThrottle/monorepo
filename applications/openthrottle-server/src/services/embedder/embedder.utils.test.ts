import { describe, expect, test } from 'vitest';

import { formatLexicalOnlyBanner } from './embedder.utils.ts';

describe('formatLexicalOnlyBanner', () => {
  describe('when the provider is local', () => {
    test('is a multi-line block that names the download command', () => {
      const banner = formatLexicalOnlyBanner({
        detail: 'No nomic-embed-text-v1.5 weights at /models.',
        provider: 'local',
        state: 'unconfigured',
      });

      expect(banner.split('\n').length).toBeGreaterThan(4);
      expect(banner).toContain('SEMANTIC SEARCH IS OFF');
      expect(banner).toContain('No nomic-embed-text-v1.5 weights at /models.');
      expect(banner).toContain('pnpm run embeddings:download-model');
    });
  });

  describe('when the provider is not local', () => {
    test('points at the provider instead of a download', () => {
      const banner = formatLexicalOnlyBanner({
        detail: 'connect ECONNREFUSED',
        provider: 'ollama',
        state: 'provider_error',
      });

      expect(banner).toContain('EMBEDDING_PROVIDER=ollama');
      expect(banner).not.toContain('embeddings:download-model');
    });
  });
});
