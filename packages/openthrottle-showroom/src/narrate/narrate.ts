#!/usr/bin/env node

/**
 * @description Render a script's narration to per-sentence audio plus timings.
 *
 *   pnpm exec tsx narrate/narrate.ts --script 03-first-plan
 *   NARRATION_BACKEND=macos-say pnpm exec tsx narrate/narrate.ts --script 03-first-plan
 *
 * The default backend is Piper (local, on-box) with the pinned ship voice; macOS
 * `say` remains selectable for a quick rehearsal pass. See NARRATION.md.
 *
 * Out: `output/<slug>/audio/NNN-<beat>.wav` (48kHz, loudness-normalised) and
 * `output/<slug>/audio/timings.json` for the assembly and caption stages.
 *
 * Loudness is measured ONCE across the whole take and the SAME gain is applied to
 * every clip. Normalising each sentence independently is wrong twice over:
 * integrated LUFS is not meaningful below about three seconds (a 1.6-second clip
 * measured -15.1 when asked for -14), and per-clip normalisation flattens the
 * relative level between sentences, which is the thing that makes narration sound
 * like a person rather than a series of announcements. What has to be consistent is
 * the level BETWEEN VIDEOS, and that is what one gain per take gives.
 */

import { execFile } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { promisify } from 'node:util';

import { captureDir, loadFormat, takeDir } from '../runner/format';
import {
  DEFAULT_ELEVENLABS_VOICE,
  elevenLabsBackend,
} from './backends/elevenlabs';
import {
  DEFAULT_FISH_AUDIO_VOICE,
  fishAudioBackend,
} from './backends/fish-audio';
import { DEFAULT_PIPER_VOICE, piperBackend } from './backends/piper';
import { sayBackend } from './backends/say';
import { parseScript } from './parse-script';
import {
  findCachedRender,
  renderCacheKey,
  storeCachedRender,
} from './render-cache';
import type { NarrationTimings, SegmentTiming, TtsBackend } from './types';

const execFileAsync = promisify(execFile);

/** Voice used when `macos-say` is selected. Rehearsal only — not the ship voice. */
const DEFAULT_SAY_VOICE = 'Samantha';

const BACKENDS: Readonly<Record<string, TtsBackend>> = {
  elevenlabs: elevenLabsBackend,
  'fish-audio': fishAudioBackend,
  'macos-say': sayBackend,
  piper: piperBackend,
};

const DEFAULT_VOICES: Readonly<Record<string, string>> = {
  elevenlabs: DEFAULT_ELEVENLABS_VOICE,
  'fish-audio': DEFAULT_FISH_AUDIO_VOICE,
  'macos-say': DEFAULT_SAY_VOICE,
  piper: DEFAULT_PIPER_VOICE,
};

const argValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);

  return index === -1 ? undefined : process.argv[index + 1];
};

const probeDuration = async (path: string): Promise<number> => {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=nw=1:nk=1',
    path,
  ]);

  return Number.parseFloat(stdout.trim());
};

/** Pass one: measure. Returns the values loudnorm wants back in pass two. */
const measureLoudness = async (
  path: string,
  targetLufs: number,
  truePeakDb: number,
): Promise<string> => {
  const filter = `loudnorm=I=${String(targetLufs)}:TP=${String(truePeakDb)}:LRA=11:print_format=json`;

  const { stderr } = await execFileAsync('ffmpeg', [
    '-hide_banner',
    '-nostdin',
    '-i',
    path,
    '-af',
    filter,
    '-f',
    'null',
    '-',
  ]).catch((error: unknown) => {
    // ffmpeg writes the measurement to stderr and exits 0; a genuine failure
    // surfaces here with its own stderr, which we re-throw with context.
    throw new Error(
      `loudnorm measurement failed for ${path}: ${String(error)}`,
    );
  });

  const start = stderr.lastIndexOf('{');
  const end = stderr.lastIndexOf('}');

  if (start === -1 || end === -1) {
    throw new Error(`loudnorm produced no measurement for ${path}`);
  }

  const parsed: unknown = JSON.parse(stderr.slice(start, end + 1));

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`loudnorm measurement for ${path} is not an object`);
  }

  const read = (key: string): string => {
    const value = Object.hasOwn(parsed, key)
      ? Reflect.get(parsed, key)
      : undefined;

    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : '0';
  };

  return [
    `loudnorm=I=${String(targetLufs)}`,
    `TP=${String(truePeakDb)}`,
    'LRA=11',
    `measured_I=${read('input_i')}`,
    `measured_TP=${read('input_tp')}`,
    `measured_LRA=${read('input_lra')}`,
    `measured_thresh=${read('input_thresh')}`,
    `offset=${read('target_offset')}`,
    'linear=true',
  ].join(':');
};

const main = async (): Promise<void> => {
  const slug = argValue('script');

  if (!slug) {
    console.error(
      'narrate: --script <slug> is required (e.g. --script 03-first-plan)',
    );
    process.exit(1);
  }

  const backendId =
    argValue('backend') ?? process.env.NARRATION_BACKEND ?? 'piper';

  const backend = BACKENDS[backendId];

  if (!backend) {
    console.error(
      `narrate: unknown backend '${backendId}' (have: ${Object.keys(BACKENDS).join(', ')})`,
    );
    process.exit(1);
  }

  const voice =
    argValue('voice') ??
    process.env.NARRATION_VOICE ??
    DEFAULT_VOICES[backend.id];

  if (!voice) {
    console.error(`narrate: no default voice for backend '${backend.id}'`);
    process.exit(1);
  }

  const format = loadFormat();
  const variantId = argValue('variant');
  const script = parseScript(slug, variantId);

  const audioDir = join(takeDir(slug, script.variant), 'audio');
  rmSync(audioDir, { force: true, recursive: true });
  mkdirSync(audioDir, { recursive: true });

  // Raw renders are cached OUTSIDE audioDir (which is wiped per run), keyed on
  // backend + model + voice + spoken text, so an edit only re-buys the sentences
  // it changed. `--no-cache` forces a full re-render.
  const cacheDir = join(captureDir(slug), 'render-cache');
  const useCache = !process.argv.includes('--no-cache');
  mkdirSync(cacheDir, { recursive: true });

  /* eslint-disable no-await-in-loop -- sequential: the backend is one process per clip */

  // Pass 1 — render every sentence raw, replaying unchanged ones from the cache.
  const rendered: {
    name: string;
    raw: string;
    sentence: (typeof script.sentences)[number];
  }[] = [];
  let cacheHits = 0;

  for (const sentence of script.sentences) {
    const name = `${String(sentence.index + 1).padStart(3, '0')}-${sentence.beat.replace(':', '')}`;
    const key = renderCacheKey({
      backendId: backend.id,
      model: backend.model,
      text: sentence.spoken,
      voice,
    });
    const cached = useCache ? findCachedRender(cacheDir, key) : undefined;

    let raw: string;

    if (cached === undefined) {
      raw = await backend.render({
        outputPath: join(audioDir, `${name}.raw.wav`),
        text: sentence.spoken,
        voice,
      });
      storeCachedRender(cacheDir, key, raw);
    } else {
      raw = join(audioDir, `${name}.raw${extname(cached)}`);
      copyFileSync(cached, raw);
      cacheHits += 1;
    }

    rendered.push({ name, raw, sentence });
  }

  if (cacheHits > 0) {
    console.log(
      `narrate: render cache: ${String(cacheHits)} of ${String(script.sentences.length)} sentences reused (--no-cache to force)`,
    );
  }

  // Pass 2 — measure the WHOLE take at once. A per-clip measurement of a
  // one-second sentence is meaningless, and per-clip gain would flatten the
  // relative level between sentences.
  const takePath = join(audioDir, 'take.raw.wav');
  const listPath = join(audioDir, 'take.concat');
  writeFileSync(
    listPath,
    `${rendered.map((entry) => `file '${entry.raw.replaceAll("'", String.raw`'\''`)}'`).join('\n')}\n`,
    'utf8',
  );
  await execFileAsync('ffmpeg', [
    '-hide_banner',
    '-nostdin',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-ar',
    String(format.audio.sampleRate),
    '-c:a',
    'pcm_s16le',
    takePath,
  ]);

  const filter = await measureLoudness(
    takePath,
    format.audio.targetLufs,
    format.audio.truePeakDb,
  );

  // Pass 3 — apply that one gain to every clip.
  const segments: SegmentTiming[] = [];
  let cursor = 0;

  for (const entry of rendered) {
    const wavPath = join(audioDir, `${entry.name}.wav`);

    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-nostdin',
      '-loglevel',
      'error',
      '-y',
      '-i',
      entry.raw,
      '-af',
      filter,
      '-ar',
      String(format.audio.sampleRate),
      '-c:a',
      'pcm_s16le',
      wavPath,
    ]);

    rmSync(entry.raw, { force: true });

    const durationSeconds = await probeDuration(wavPath);

    segments.push({
      beat: entry.sentence.beat,
      durationSeconds,
      endSeconds: cursor + durationSeconds,
      file: `${entry.name}.wav`,
      index: entry.sentence.index,
      startSeconds: cursor,
      written: entry.sentence.written,
    });

    cursor += durationSeconds;
  }

  rmSync(takePath, { force: true });
  rmSync(listPath, { force: true });
  /* eslint-enable no-await-in-loop */

  const timings: NarrationTimings = {
    backend: backend.id,
    integratedLufsTarget: format.audio.targetLufs,
    ...(backend.model === undefined ? {} : { model: backend.model }),
    segments,
    slug,
    totalSeconds: cursor,
    variant: script.variant,
    voice,
  };

  writeFileSync(
    join(audioDir, 'timings.json'),
    `${JSON.stringify(timings, null, 2)}\n`,
    'utf8',
  );

  const budget = format.formats[script.format].maxDurationSeconds;
  console.log(
    `narrate: ${slug} — ${String(segments.length)} segments, ${cursor.toFixed(2)}s spoken (${backend.id}/${voice})`,
  );

  if (script.format === 'short' && cursor > budget) {
    console.warn(
      `narrate: warning: ${cursor.toFixed(1)}s of narration exceeds the ${String(budget)}s cap — cut words, do not speed up the voice`,
    );
  }

  if (backend.sendsDataOffBox) {
    console.warn(
      'narrate: warning: this backend sends narration text to a third party',
    );
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
