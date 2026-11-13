import { describe, expect, test } from 'vitest';

import { isEmbeddingModelName } from '../isEmbeddingModelName';

describe('isEmbeddingModelName', () => {
  describe('when the model is embedding-only', () => {
    test.each([
      'all-minilm:latest',
      'nomic-embed-text',
      'mxbai-embed-large:335m',
      'snowflake-arctic-embed',
      'granite-embedding',
      'embeddinggemma',
      'qwen3-embedding:0.6b',
      'bge-m3',
      'paraphrase-multilingual',
      'text-embedding-3-small',
      'hf.co/BAAI/bge-large-en',
    ])('matches %s', (model) => {
      expect(isEmbeddingModelName(model)).toBe(true);
    });
  });

  describe('when the model can chat', () => {
    test.each([
      'llama3',
      'qwen2.5-coder:7b',
      'gpt-oss:20b',
      'mistral',
      'cursor',
    ])('does not match %s', (model) => {
      expect(isEmbeddingModelName(model)).toBe(false);
    });
  });
});
