import { describe, expect, test } from 'vitest';

import {
  CODE_EMBEDDINGS_ALLOW_HOSTED_ENV,
  resolveCodeEmbeddingPolicy,
} from '../resolveCodeEmbeddingPolicy.ts';

describe('resolveCodeEmbeddingPolicy', () => {
  describe('when the provider is self-hosted', () => {
    test.each(['local', 'ollama'] as const)(
      'allows %s with no opt-in',
      (provider) => {
        expect(resolveCodeEmbeddingPolicy(provider, {})).toEqual({
          allowed: true,
        });
      },
    );
  });

  describe('when the provider is hosted', () => {
    test.each(['openai', 'gemini'] as const)(
      'refuses %s without the opt-in, naming the env var',
      (provider) => {
        const policy = resolveCodeEmbeddingPolicy(provider, {});

        expect(policy.allowed).toBe(false);
        if (policy.allowed) return;
        expect(policy.detail).toContain(`EMBEDDING_PROVIDER=${provider}`);
        expect(policy.detail).toContain(
          `${CODE_EMBEDDINGS_ALLOW_HOSTED_ENV}=true`,
        );
      },
    );

    test('allows it when the opt-in is true, trimmed and case-insensitive', () => {
      expect(
        resolveCodeEmbeddingPolicy('openai', {
          [CODE_EMBEDDINGS_ALLOW_HOSTED_ENV]: ' TRUE ',
        }),
      ).toEqual({ allowed: true });
    });

    test.each(['1', 'yes', 'false', ''])('keeps refusing for %j', (value) => {
      expect(
        resolveCodeEmbeddingPolicy('gemini', {
          [CODE_EMBEDDINGS_ALLOW_HOSTED_ENV]: value,
        }).allowed,
      ).toBe(false);
    });
  });
});
