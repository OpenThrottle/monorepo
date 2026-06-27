import { describe, expect, it } from 'vitest';

import { getEmbeddingModelDimensions } from './index';

describe('getEmbeddingModelDimensions', () => {
  describe('known models', () => {
    // Locks the dimension table. A regression here (e.g. the historical gemini
    // mistake) means a vector column width that no longer matches the model.
    const cases: Array<[string, number]> = [
      ['all-minilm', 384],
      ['gemini-embedding-001', 3072],
      ['mxbai-embed-large', 1024],
      ['nomic-embed-text', 768],
      ['text-embedding-005', 768],
      ['text-multilingual-embedding-002', 768],
    ];

    it.each(cases)('maps %s to %i dimensions', (model, dimensions) => {
      expect(getEmbeddingModelDimensions(model)).toBe(dimensions);
    });
  });

  describe('unknown models', () => {
    const unknown = ['', 'gpt-4', 'gemini-embedding-002', 'all-MiniLM'];

    it.each(unknown)('throws for %s', (model) => {
      expect(() => getEmbeddingModelDimensions(model)).toThrow(
        /Invalid embedding model/,
      );
    });
  });
});
