/**
 * @description Per-sentence render cache for the narrate stage.
 *
 * Hosted backends bill per character and narrate re-renders the whole script on
 * every run, so a one-word edit re-bought every sentence. The cache keys each
 * RAW render (pre-gain — the loudness pass stays whole-take, so cached audio
 * re-normalises correctly) on everything that changes the audio: backend, model,
 * voice, and the spoken text. Any change misses; an unchanged sentence replays
 * from disk for free.
 */

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

export interface RenderCacheKeyParts {
  readonly backendId: string;
  readonly model?: string;
  readonly text: string;
  readonly voice: string;
}

/**
 * @description Stable key for one sentence render. 16 hex chars of sha256.
 * @public
 */
export const renderCacheKey = (parts: RenderCacheKeyParts): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        parts.backendId,
        parts.model ?? '',
        parts.voice,
        parts.text,
      ]),
    )
    .digest('hex')
    .slice(0, 16);

/**
 * @description Path of the cached render for a key, or undefined on a miss.
 *   The extension is whatever the backend originally produced (wav/mp3/aiff).
 * @public
 */
export const findCachedRender = (
  cacheDir: string,
  key: string,
): string | undefined => {
  if (!existsSync(cacheDir)) {
    return undefined;
  }

  const hit = readdirSync(cacheDir).find((file) => file.startsWith(`${key}.`));

  return hit === undefined ? undefined : join(cacheDir, hit);
};

/**
 * @description Copy a freshly rendered file into the cache under its key,
 *   preserving the backend's container extension. Returns the cache path.
 * @public
 */
export const storeCachedRender = (
  cacheDir: string,
  key: string,
  renderedPath: string,
): string => {
  const cachePath = join(cacheDir, `${key}${extname(renderedPath)}`);

  copyFileSync(renderedPath, cachePath);

  return cachePath;
};
