/**
 * @description The whole-take render path: one backend request (or a take-cache hit) for the whole
 * script, word timings mapped to sentence boundaries, one measurement and one gain,
 * then filter-free slices into the same per-sentence files the per-sentence path
 * writes.
 *
 * ffmpeg and ffprobe are injected so the orchestration is testable without either.
 * Intermediates (raw take, normalised take) live in a temp directory that is always
 * removed, so `audioDir` ends up holding only the `NNN-<beat>.wav` clips.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  assertSpansCoverTake,
  FRAME_SECONDS,
  mapWordsToSentences,
} from './map-words.ts';
import { buildNormalizeArgs, buildSliceArgs } from './slice-take.ts';
import { findCachedTake, storeCachedTake, takeCacheKey } from './take-cache.ts';
import type {
  NarrationSentence,
  RenderedTake,
  SegmentTiming,
  TtsBackend,
} from './types.ts';

export interface WholeTakeDeps {
  readonly ffmpeg: (args: readonly string[]) => Promise<void>;
  /** Measure the raw take once; returns the loudnorm filter to apply. */
  readonly measureLoudness: (path: string) => Promise<string>;
  readonly probeDuration: (path: string) => Promise<number>;
}

export interface WholeTakeCache {
  readonly chunkLength: number;
  readonly dir: string;
}

export interface WholeTakeOptions {
  readonly audioDir: string;
  readonly backend: TtsBackend;
  /** Take cache; `undefined` (`--no-cache`) always renders and stores nothing. */
  readonly cache: WholeTakeCache | undefined;
  readonly format: { readonly audio: { readonly sampleRate: number } };
  readonly script: { readonly sentences: readonly NarrationSentence[] };
  readonly voice: string;
}

export interface WholeTakeResult {
  readonly segments: readonly SegmentTiming[];
  readonly totalSeconds: number;
}

const clipName = (sentence: NarrationSentence): string => {
  return `${String(sentence.index + 1).padStart(3, '0')}-${sentence.beat.replace(':', '')}`;
};

interface RenderAndStoreOptions {
  readonly backend: TtsBackend;
  readonly cache: WholeTakeCache | undefined;
  readonly key: string | undefined;
  readonly text: string;
  readonly voice: string;
  readonly workDir: string;
}

const keyFor = (
  cache: WholeTakeCache | undefined,
  parts: { backend: TtsBackend; text: string; voice: string },
): string | undefined => {
  if (cache === undefined) {
    return undefined;
  }

  return takeCacheKey({
    backendId: parts.backend.id,
    chunkLength: cache.chunkLength,
    model: parts.backend.model,
    text: parts.text,
    voice: parts.voice,
  });
};

const lookupCachedTake = (
  cache: WholeTakeCache | undefined,
  key: string | undefined,
): RenderedTake | undefined => {
  if (cache === undefined || key === undefined) {
    return undefined;
  }

  return findCachedTake(cache.dir, key);
};

/** A cache miss: buy the take, then store it with its words under its key. */
const renderAndStore = async (
  options: RenderAndStoreOptions,
): Promise<RenderedTake> => {
  const { backend, cache, key, text, voice, workDir } = options;

  if (backend.renderTake === undefined) {
    throw new Error(`narrate: backend '${backend.id}' has no renderTake`);
  }

  const take = await backend.renderTake({
    outputPath: join(workDir, 'take.raw.wav'),
    text,
    voice,
  });

  if (cache !== undefined && key !== undefined) {
    mkdirSync(cache.dir, { recursive: true });
    storeCachedTake(cache.dir, key, take);
  }

  return take;
};

/**
 * @description Render, normalise and slice one whole take. Returns the same
 * segments/total shape as the per-sentence path.
 */
export const renderWholeTake = async (
  options: WholeTakeOptions,
  deps: WholeTakeDeps,
): Promise<WholeTakeResult> => {
  const { audioDir, backend, cache, format, script, voice } = options;

  if (backend.renderTake === undefined) {
    throw new Error(`narrate: backend '${backend.id}' has no renderTake`);
  }

  mkdirSync(audioDir, { recursive: true });

  const workDir = mkdtempSync(join(tmpdir(), 'narrate-take-'));

  try {
    const text = script.sentences.map((sentence) => sentence.spoken).join(' ');
    const key = keyFor(cache, { backend, text, voice });
    const cached = lookupCachedTake(cache, key);
    const take =
      cached ??
      (await renderAndStore({ backend, cache, key, text, voice, workDir }));

    const takeSeconds = await deps.probeDuration(take.audioPath);
    const mapped = mapWordsToSentences(
      script.sentences,
      take.words,
      takeSeconds,
    );

    if (!mapped.ok) {
      throw new Error(
        `narrate: whole-take desync at sentence ${String(mapped.failure.sentenceIndex)}: ${mapped.failure.message}; unmatched words: ${JSON.stringify(mapped.failure.unmatchedWords)}`,
      );
    }

    assertSpansCoverTake(mapped.spans, takeSeconds);

    // One measurement of the raw take, one gain, and the resample to format.json's
    // rate in the same pass. Everything after this reads the normalised take.
    const filter = await deps.measureLoudness(take.audioPath);
    const normalizedPath = join(workDir, 'take.norm.wav');

    await deps.ffmpeg(
      buildNormalizeArgs({
        audioFilter: filter,
        input: take.audioPath,
        output: normalizedPath,
        sampleRate: format.audio.sampleRate,
      }),
    );

    // Gain and resample must not move the cut times, which were computed from the
    // raw take. Fail loudly rather than re-scale them.
    const normalizedSeconds = await deps.probeDuration(normalizedPath);

    if (Math.abs(normalizedSeconds - takeSeconds) > FRAME_SECONDS) {
      throw new Error(
        `narrate: normalising changed the take from ${takeSeconds.toFixed(3)}s to ${normalizedSeconds.toFixed(3)}s; the sentence cuts no longer hold`,
      );
    }

    const segments: SegmentTiming[] = [];

    /* eslint-disable no-await-in-loop -- sequential: one ffmpeg process per clip */
    for (const [position, span] of mapped.spans.entries()) {
      const sentence = script.sentences[position];

      if (sentence === undefined) {
        throw new Error(`narrate: no sentence for span ${String(position)}`);
      }

      const name = clipName(sentence);

      await deps.ffmpeg(
        buildSliceArgs({
          endSeconds: span.endSeconds,
          input: normalizedPath,
          output: join(audioDir, `${name}.wav`),
          startSeconds: span.startSeconds,
        }),
      );

      segments.push({
        beat: sentence.beat,
        durationSeconds: span.endSeconds - span.startSeconds,
        endSeconds: span.endSeconds,
        file: `${name}.wav`,
        index: sentence.index,
        startSeconds: span.startSeconds,
        written: sentence.written,
      });
    }
    /* eslint-enable no-await-in-loop */

    return { segments, totalSeconds: takeSeconds };
  } finally {
    rmSync(workDir, { force: true, recursive: true });
  }
};
