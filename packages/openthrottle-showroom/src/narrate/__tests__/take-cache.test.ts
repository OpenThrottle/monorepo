import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import type { TakeCacheKeyParts } from '../take-cache.ts';
import {
  findCachedTake,
  storeCachedTake,
  takeCacheKey,
} from '../take-cache.ts';
import type { RenderedTake } from '../types.ts';

const base: TakeCacheKeyParts = {
  backendId: 'fish-audio',
  chunkLength: 300,
  model: 'm1',
  text: 'Hello there. Go now.',
  voice: 'v1',
};

const freshTake = (): { cacheDir: string; take: RenderedTake } => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'take-cache-'));
  const audioPath = join(mkdtempSync(join(tmpdir(), 'take-src-')), 'take.wav');

  writeFileSync(audioPath, 'audio');

  return {
    cacheDir,
    take: {
      audioPath,
      words: [{ endSeconds: 0.4, startSeconds: 0, text: 'Hello' }],
    },
  };
};

describe('takeCacheKey', () => {
  test('is stable for identical inputs', () => {
    expect(takeCacheKey({ ...base })).toBe(takeCacheKey({ ...base }));
  });

  test.each([
    ['backend', { backendId: 'other' }],
    ['model', { model: 'm2' }],
    ['voice', { voice: 'v2' }],
    ['text', { text: 'Hello there. Go now!' }],
    ['chunk length', { chunkLength: 200 }],
  ])('changes when the %s changes', (_name, change) => {
    expect(takeCacheKey({ ...base, ...change })).not.toBe(takeCacheKey(base));
  });
});

describe('findCachedTake', () => {
  test('is a miss for an empty cache', () => {
    expect(findCachedTake(freshTake().cacheDir, 'k')).toBeUndefined();
  });

  test('a stored take is a hit carrying both audio and words', () => {
    const { cacheDir, take } = freshTake();

    storeCachedTake(cacheDir, 'k', take);

    const hit = findCachedTake(cacheDir, 'k');

    expect(hit?.words).toEqual(take.words);
    expect(hit?.audioPath.endsWith('.wav')).toBe(true);
  });

  test('leaves no temporary files behind', () => {
    const { cacheDir, take } = freshTake();

    storeCachedTake(cacheDir, 'k', take);

    expect(readdirSync(cacheDir).sort()).toEqual([
      'take-k.wav',
      'take-k.words.json',
    ]);
  });

  test('audio without words is a miss', () => {
    const { cacheDir, take } = freshTake();

    storeCachedTake(cacheDir, 'k', take);
    rmSync(join(cacheDir, 'take-k.words.json'));

    expect(findCachedTake(cacheDir, 'k')).toBeUndefined();
  });

  test('words without audio is a miss', () => {
    const { cacheDir, take } = freshTake();

    storeCachedTake(cacheDir, 'k', take);
    rmSync(join(cacheDir, 'take-k.wav'));

    expect(findCachedTake(cacheDir, 'k')).toBeUndefined();
  });

  test('unreadable or malformed words are a miss', () => {
    const { cacheDir, take } = freshTake();

    storeCachedTake(cacheDir, 'k', take);
    writeFileSync(join(cacheDir, 'take-k.words.json'), '{not json');
    expect(findCachedTake(cacheDir, 'k')).toBeUndefined();

    writeFileSync(join(cacheDir, 'take-k.words.json'), '[{"text":1}]');
    expect(findCachedTake(cacheDir, 'k')).toBeUndefined();
  });
});
