import { describe, expect, it } from 'vitest';

import {
  decodeModelOptionId,
  encodeModelOptionId,
  toChatModelOptions,
} from '../chat-model-option';

describe('encode/decode model option id', () => {
  it('round-trips baseUrl + model', () => {
    const id = encodeModelOptionId('http://localhost:11434/v1', 'llama3');
    expect(id).toBe('http://localhost:11434/v1::llama3');
    expect(decodeModelOptionId(id)).toEqual({
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3',
    });
  });

  it('returns null for a malformed id', () => {
    expect(decodeModelOptionId('no-separator')).toBeNull();
    expect(decodeModelOptionId('::llama3')).toBeNull();
    expect(decodeModelOptionId('http://x/v1::')).toBeNull();
  });
});

describe('toChatModelOptions', () => {
  it('flattens endpoints × models with provider fallback to host', () => {
    const options = toChatModelOptions({
      endpoints: [
        {
          baseUrl: 'http://localhost:11434/v1',
          host: 'localhost',
          models: ['llama3', 'qwen'],
          provider: 'ollama',
        },
        {
          baseUrl: 'http://localhost:1234/v1',
          host: 'localhost',
          models: ['mlx'],
          provider: null,
        },
      ],
      totalCount: 2,
    });

    expect(options).toEqual([
      {
        description: 'ollama',
        id: 'http://localhost:11434/v1::llama3',
        label: 'llama3',
      },
      {
        description: 'ollama',
        id: 'http://localhost:11434/v1::qwen',
        label: 'qwen',
      },
      {
        description: 'localhost',
        id: 'http://localhost:1234/v1::mlx',
        label: 'mlx',
      },
    ]);
  });

  it('returns an empty list when nothing is discovered', () => {
    expect(toChatModelOptions({ endpoints: [], totalCount: 0 })).toEqual([]);
  });
});
