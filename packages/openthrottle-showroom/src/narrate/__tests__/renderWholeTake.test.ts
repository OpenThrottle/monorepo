import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import type { WholeTakeDeps, WholeTakeOptions } from '../renderWholeTake.ts';
import { renderWholeTake } from '../renderWholeTake.ts';
import { findCachedTake } from '../take-cache.ts';
import type { NarrationSentence, TtsBackend, WordTiming } from '../types.ts';

const sentences: NarrationSentence[] = [
  { beat: '0:00', index: 0, spoken: 'Hello there.', written: 'Hello there.' },
  { beat: '0:02', index: 1, spoken: 'Go now.', written: 'Go now.' },
];

const words: WordTiming[] = [
  { endSeconds: 0.4, startSeconds: 0, text: 'Hello' },
  { endSeconds: 0.8, startSeconds: 0.4, text: 'there' },
  { endSeconds: 1.2, startSeconds: 0.8, text: 'Go' },
  { endSeconds: 1.6, startSeconds: 1.2, text: 'now' },
];

const backend: TtsBackend = {
  id: 'fake',
  render: (request) => Promise.resolve(request.outputPath),
  renderTake: (request) => {
    writeFileSync(request.outputPath, 'raw');

    return Promise.resolve({ audioPath: request.outputPath, words });
  },
  sendsDataOffBox: false,
};

const fakeDeps = (durations: readonly number[]): WholeTakeDeps => {
  let probes = 0;

  return {
    // Every ffmpeg call writes its output file, as the real one would.
    ffmpeg: (args) => {
      const output = args.at(-1);

      if (output !== undefined) {
        writeFileSync(output, 'audio');
      }

      return Promise.resolve();
    },
    measureLoudness: () => Promise.resolve('loudnorm=fake'),
    probeDuration: () => {
      const value = durations[Math.min(probes, durations.length - 1)] ?? 0;

      probes += 1;

      return Promise.resolve(value);
    },
  };
};

const optionsFor = (audioDir: string): WholeTakeOptions => {
  return {
    audioDir,
    backend,
    cache: undefined,
    format: { audio: { sampleRate: 48_000 } },
    script: { sentences },
    voice: 'v',
  };
};

describe('renderWholeTake', () => {
  test('leaves only the per-sentence clips in the audio dir', async () => {
    const audioDir = mkdtempSync(join(tmpdir(), 'whole-take-'));

    await renderWholeTake(optionsFor(audioDir), fakeDeps([1.6]));

    expect(readdirSync(audioDir).sort()).toEqual([
      '001-000.wav',
      '002-002.wav',
    ]);
  });

  test('cleans up intermediates when it fails too', async () => {
    const audioDir = mkdtempSync(join(tmpdir(), 'whole-take-'));

    await expect(
      renderWholeTake(optionsFor(audioDir), fakeDeps([1.6, 3])),
    ).rejects.toThrow(/normalising changed the take/);
    expect(readdirSync(audioDir)).toEqual([]);
  });

  test('totalSeconds is the take duration and segments sum to it', async () => {
    const audioDir = mkdtempSync(join(tmpdir(), 'whole-take-'));
    const result = await renderWholeTake(optionsFor(audioDir), fakeDeps([1.6]));
    const sum = result.segments.reduce(
      (total, segment) => total + segment.durationSeconds,
      0,
    );

    expect(result.totalSeconds).toBe(1.6);
    expect(sum).toBeCloseTo(1.6);
    expect(result.segments.map((segment) => segment.file)).toEqual([
      '001-000.wav',
      '002-002.wav',
    ]);
  });
});

describe('renderWholeTake with a take cache', () => {
  const countingBackend = (): { backend: TtsBackend; calls: () => number } => {
    let calls = 0;

    return {
      backend: {
        ...backend,
        renderTake: (request) => {
          calls += 1;
          writeFileSync(request.outputPath, 'raw');

          return Promise.resolve({ audioPath: request.outputPath, words });
        },
      },
      calls: () => calls,
    };
  };

  test('a miss renders once and a second run is a hit that skips renderTake', async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), 'whole-take-cache-'));
    const counting = countingBackend();
    const run = async (): Promise<void> => {
      const audioDir = mkdtempSync(join(tmpdir(), 'whole-take-'));

      await renderWholeTake(
        {
          ...optionsFor(audioDir),
          backend: counting.backend,
          cache: { chunkLength: 300, dir: cacheDir },
        },
        fakeDeps([1.6]),
      );
    };

    await run();
    expect(counting.calls()).toBe(1);

    await run();
    expect(counting.calls()).toBe(1);
  });

  test('a half-present entry is re-rendered', async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), 'whole-take-cache-'));
    const counting = countingBackend();
    const options = {
      ...optionsFor(mkdtempSync(join(tmpdir(), 'whole-take-'))),
      backend: counting.backend,
      cache: { chunkLength: 300, dir: cacheDir },
    };

    await renderWholeTake(options, fakeDeps([1.6]));

    for (const file of readdirSync(cacheDir).filter((name) =>
      name.endsWith('.words.json'),
    )) {
      rmSync(join(cacheDir, file));
    }

    await renderWholeTake(options, fakeDeps([1.6]));

    expect(counting.calls()).toBe(2);
    expect(findCachedTake(cacheDir, 'nope')).toBeUndefined();
  });

  test('no cache (--no-cache) renders every time and stores nothing', async () => {
    const counting = countingBackend();
    const audioDir = mkdtempSync(join(tmpdir(), 'whole-take-'));

    await renderWholeTake(
      { ...optionsFor(audioDir), backend: counting.backend },
      fakeDeps([1.6]),
    );
    await renderWholeTake(
      { ...optionsFor(audioDir), backend: counting.backend },
      fakeDeps([1.6]),
    );

    expect(counting.calls()).toBe(2);
  });
});
