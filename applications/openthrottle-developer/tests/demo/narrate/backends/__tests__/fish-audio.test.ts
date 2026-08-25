import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  DEFAULT_FISH_AUDIO_MODEL,
  DEFAULT_FISH_AUDIO_VOICE,
  fishAudioBackend,
  resolveFishAudioApiKey,
} from '../fish-audio';

describe('resolveFishAudioApiKey', () => {
  test('returns the key when set', () => {
    expect(resolveFishAudioApiKey({ FISH_AUDIO_API_KEY: 'abc' })).toBe('abc');
  });

  test('fails loudly when unset', () => {
    expect(() => resolveFishAudioApiKey({})).toThrow(
      /FISH_AUDIO_API_KEY is not set/,
    );
  });

  test('fails loudly when blank', () => {
    expect(() => resolveFishAudioApiKey({ FISH_AUDIO_API_KEY: '  ' })).toThrow(
      /FISH_AUDIO_API_KEY is not set/,
    );
  });
});

describe('fishAudioBackend', () => {
  test('identifies as off-box fish-audio with a pinned OpenAudio model', () => {
    expect(fishAudioBackend.id).toBe('fish-audio');
    expect(fishAudioBackend.model).toBe(DEFAULT_FISH_AUDIO_MODEL);
    expect(fishAudioBackend.sendsDataOffBox).toBe(true);
  });

  test('render fails loudly when the API key is missing', async () => {
    const previous = process.env.FISH_AUDIO_API_KEY;

    delete process.env.FISH_AUDIO_API_KEY;

    try {
      await expect(
        fishAudioBackend.render({
          outputPath: join(tmpdir(), 'out.wav'),
          text: 'hello',
          voice: DEFAULT_FISH_AUDIO_VOICE,
        }),
      ).rejects.toThrow(/FISH_AUDIO_API_KEY is not set/);
    } finally {
      if (previous === undefined) {
        delete process.env.FISH_AUDIO_API_KEY;
      } else {
        process.env.FISH_AUDIO_API_KEY = previous;
      }
    }
  });
});
