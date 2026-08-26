import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  findCachedRender,
  renderCacheKey,
  storeCachedRender,
} from '../render-cache';

describe('renderCacheKey', () => {
  test('is stable for identical inputs', () => {
    const parts = {
      backendId: 'elevenlabs',
      model: 'eleven_multilingual_v2',
      text: 'Open Throttle is local first.',
      voice: 'bIHbv24MWmeRgasZH58o',
    };

    expect(renderCacheKey(parts)).toBe(renderCacheKey({ ...parts }));
    expect(renderCacheKey(parts)).toMatch(/^[0-9a-f]{16}$/);
  });

  test.each([
    ['backendId', { backendId: 'piper' }],
    ['model', { model: 's1' }],
    ['text', { text: 'Different sentence.' }],
    ['voice', { voice: 'other-voice' }],
  ])('changing %s changes the key', (_field, override) => {
    const parts = {
      backendId: 'elevenlabs',
      model: 'eleven_multilingual_v2',
      text: 'Open Throttle is local first.',
      voice: 'bIHbv24MWmeRgasZH58o',
    };

    expect(renderCacheKey({ ...parts, ...override })).not.toBe(
      renderCacheKey(parts),
    );
  });

  test('missing model and empty model hash alike', () => {
    const parts = {
      backendId: 'piper',
      text: 'hello',
      voice: 'en_US-libritts_r-medium',
    };

    expect(renderCacheKey(parts)).toBe(
      renderCacheKey({ ...parts, model: undefined }),
    );
  });
});

describe('findCachedRender / storeCachedRender', () => {
  test('round-trips a render preserving the extension', () => {
    const dir = mkdtempSync(join(tmpdir(), 'render-cache-'));
    const renderedPath = join(dir, '001-000.raw.mp3');

    writeFileSync(renderedPath, 'fake-audio');

    const key = 'abcdef0123456789';

    expect(findCachedRender(dir, key)).toBeUndefined();

    const cachePath = storeCachedRender(dir, key, renderedPath);

    expect(cachePath.endsWith('.mp3')).toBe(true);
    expect(findCachedRender(dir, key)).toBe(cachePath);
    expect(readFileSync(cachePath, 'utf8')).toBe('fake-audio');
  });

  test('misses on a directory that does not exist', () => {
    expect(
      findCachedRender(join(tmpdir(), 'no-such-render-cache'), 'deadbeef'),
    ).toBeUndefined();
  });
});

describe('sharing across variants', () => {
  test('the key ignores which variant asked for the sentence', () => {
    // Two takes of one episode share their middle lines far more often than their
    // opening and closing ones. Keying on backend + model + voice + text means a
    // shared sentence is rendered once, which against a hosted TTS is a real
    // saving rather than a tidiness argument. Nothing variant-shaped may enter
    // this key.
    const parts = {
      backendId: 'elevenlabs',
      model: 'eleven_v3',
      text: 'Plans and tasks, written straight into OpenThrottle.',
      voice: 'will',
    };

    expect(renderCacheKey(parts)).toBe(renderCacheKey({ ...parts }));
  });

  test('a different voice is a different render', () => {
    const base = {
      backendId: 'elevenlabs',
      model: 'eleven_v3',
      text: 'Same words.',
      voice: 'will',
    };

    expect(renderCacheKey(base)).not.toBe(
      renderCacheKey({ ...base, voice: 'other' }),
    );
  });
});
