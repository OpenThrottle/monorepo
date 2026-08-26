import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  DEFAULT_ELEVENLABS_MODEL,
  DEFAULT_ELEVENLABS_VOICE,
  elevenLabsBackend,
  resolveElevenLabsApiKey,
} from '../elevenlabs';

describe('resolveElevenLabsApiKey', () => {
  test('returns the key when set', () => {
    expect(resolveElevenLabsApiKey({ ELEVENLABS_API_KEY: 'abc' })).toBe('abc');
  });

  test('fails loudly when unset', () => {
    expect(() => resolveElevenLabsApiKey({})).toThrow(
      /ELEVENLABS_API_KEY is not set/,
    );
  });

  test('fails loudly when blank', () => {
    expect(() => resolveElevenLabsApiKey({ ELEVENLABS_API_KEY: '  ' })).toThrow(
      /ELEVENLABS_API_KEY is not set/,
    );
  });
});

describe('elevenLabsBackend', () => {
  test('identifies as off-box elevenlabs with a pinned model', () => {
    expect(elevenLabsBackend.id).toBe('elevenlabs');
    expect(elevenLabsBackend.model).toBe(DEFAULT_ELEVENLABS_MODEL);
    expect(elevenLabsBackend.sendsDataOffBox).toBe(true);
  });

  test('render fails loudly when the API key is missing', async () => {
    const previous = process.env.ELEVENLABS_API_KEY;

    delete process.env.ELEVENLABS_API_KEY;

    try {
      await expect(
        elevenLabsBackend.render({
          outputPath: join(tmpdir(), 'out.wav'),
          text: 'hello',
          voice: DEFAULT_ELEVENLABS_VOICE,
        }),
      ).rejects.toThrow(/ELEVENLABS_API_KEY is not set/);
    } finally {
      if (previous === undefined) {
        delete process.env.ELEVENLABS_API_KEY;
      } else {
        process.env.ELEVENLABS_API_KEY = previous;
      }
    }
  });
});
