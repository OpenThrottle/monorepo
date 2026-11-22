/**
 * @description Take-granularity render cache for the whole-take narrate path.
 *
 * One entry is the RAW take audio plus its word timings, stored together under one
 * key. The alignment is not optional: a cached wav without its words cannot be
 * sliced, so it would be a miss dressed up as a hit. Both files must exist and the
 * words must parse, or the lookup is a miss and the take is bought again.
 *
 * Trade-off: the key covers the FULL spoken text, so a one-word edit re-buys the
 * whole take. At whole-take prices that is about $0.17 for a full 24-script season
 * pass, which is cheap next to the per-sentence cache's bookkeeping. An unchanged
 * script replays for free, and `--no-cache` forces a fresh render.
 *
 * The per-sentence cache (./render-cache.ts) is separate and unchanged. Entries here
 * are named `take-<key>.wav` and `take-<key>.words.json`, so the two never collide
 * in one directory.
 */

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import type { RenderedTake, WordTiming } from './types.ts';
import { RENDER_MODE } from './types.ts';

export interface TakeCacheKeyParts {
  readonly backendId: string;
  /** The backend's request-shaping chunk length, which changes the audio. */
  readonly chunkLength: number;
  readonly model?: string;
  /** The full spoken text of the take. */
  readonly text: string;
  readonly voice: string;
}

/**
 * @description Stable key for one whole take: backend, model, voice, render mode,
 * the full spoken text and chunk length. 16 hex chars of sha256.
 */
export const takeCacheKey = (parts: TakeCacheKeyParts): string => {
  return createHash('sha256')
    .update(
      JSON.stringify([
        parts.backendId,
        parts.model ?? '',
        parts.voice,
        RENDER_MODE.WHOLE_TAKE,
        parts.text,
        parts.chunkLength,
      ]),
    )
    .digest('hex')
    .slice(0, 16);
};

const audioPathFor = (cacheDir: string, key: string): string => {
  return join(cacheDir, `take-${key}.wav`);
};

const wordsPathFor = (cacheDir: string, key: string): string => {
  return join(cacheDir, `take-${key}.words.json`);
};

const isWordTiming = (value: unknown): value is WordTiming => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'text' in value &&
    typeof value.text === 'string' &&
    'startSeconds' in value &&
    typeof value.startSeconds === 'number' &&
    'endSeconds' in value &&
    typeof value.endSeconds === 'number'
  );
};

/**
 * @description The cached take for a key, or undefined on a miss. Either file
 * missing, or the words unreadable or malformed, is a miss.
 */
export const findCachedTake = (
  cacheDir: string,
  key: string,
): RenderedTake | undefined => {
  const audioPath = audioPathFor(cacheDir, key);
  const wordsPath = wordsPathFor(cacheDir, key);

  if (!existsSync(audioPath) || !existsSync(wordsPath)) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(wordsPath, 'utf8'));

    if (!Array.isArray(parsed) || !parsed.every(isWordTiming)) {
      return undefined;
    }

    return { audioPath, words: parsed };
  } catch {
    return undefined;
  }
};

/**
 * @description Store a freshly rendered take with its words. Each file is written
 * under a temporary name and renamed into place, the words last, so a crash leaves
 * a miss rather than a half-present entry that looks whole.
 */
export const storeCachedTake = (
  cacheDir: string,
  key: string,
  take: RenderedTake,
): void => {
  const audioPath = audioPathFor(cacheDir, key);
  const wordsPath = wordsPathFor(cacheDir, key);
  const audioTemp = `${audioPath}.tmp`;
  const wordsTemp = `${wordsPath}.tmp`;

  try {
    copyFileSync(take.audioPath, audioTemp);
    writeFileSync(wordsTemp, `${JSON.stringify(take.words)}\n`, 'utf8');
    renameSync(audioTemp, audioPath);
    renameSync(wordsTemp, wordsPath);
  } finally {
    rmSync(audioTemp, { force: true });
    rmSync(wordsTemp, { force: true });
  }
};
