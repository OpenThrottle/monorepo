/**
 * @description Build one master: picture from a frame list, narration laid out on
 * that capture's timeline, overlays, then the shared outro card.
 *
 * Extracted so the landscape and portrait masters are the same code path. They are
 * NOT the same source: a portrait capture (`--portrait`) is a separate recording at
 * the Short's own viewport, with its own step timings, so its narration has to be
 * re-laid out rather than reused.
 */

import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { buildCues, toSrt } from './captions';
import { cropExpression, cropPath, planTimeline } from './timeline';
import type { Cue } from './captions';
import type { FormatSpec, FormatVariant } from '../runner/format';
import type { NarrationTimings } from '../narrate/types';
import type { RecordingManifest } from '../runner/types';

const execFileAsync = promisify(execFile);

export interface Overlay {
  readonly endSeconds: number;
  readonly path: string;
  readonly startSeconds: number;
}

export interface MasterRequest {
  readonly audioDir: string;
  /** Directory holding frames.concat and its frames/ — concat paths are relative to it. */
  readonly captureDir: string;
  readonly format: FormatSpec;
  readonly manifest: RecordingManifest;
  readonly musicPath?: string | undefined;
  readonly outputPath: string;
  readonly outroPngPath: string;
  /** Rendered per-video card overlays other than captions (e.g. the lower third). */
  readonly overlays: readonly Overlay[];
  /**
   * How to reach the target frame from the capture. 'none' when the capture is
   * already at the target size, which is the point of a portrait pass.
   */
  readonly reframe: 'crop' | 'fit' | 'none';
  readonly srtPath?: string | undefined;
  readonly timings: NarrationTimings;
  readonly variant: FormatVariant;
  readonly workDir: string;
}

export interface MasterResult {
  readonly cues: readonly Cue[];
  readonly heldSeconds: number;
}

const ffmpeg = async (args: readonly string[]): Promise<void> => {
  await execFileAsync(
    'ffmpeg',
    ['-hide_banner', '-nostdin', '-loglevel', 'error', '-y', ...args],
    {
      maxBuffer: 32 * 1024 * 1024,
    },
  );
};

/**
 * Hold the last frame of a beat whose narration runs longer than its action.
 *
 * A `duration` applies to the file line BEFORE it, so the held frame is repeated
 * first and given its own duration second. Emitting the duration first yields two
 * durations for one file, which silently stretches the entire video.
 */
const extendConcat = (
  concatSource: string,
  plans: readonly {
    readonly extendSeconds: number;
    readonly videoEnd: number;
  }[],
): string => {
  const lines = concatSource.trimEnd().split('\n');
  const holds = plans
    .filter((plan) => plan.extendSeconds > 0.001)
    .map((plan) => ({ extend: plan.extendSeconds, until: plan.videoEnd }))
    .sort((a, b) => a.until - b.until);

  if (holds.length === 0) {
    return concatSource;
  }

  const out: string[] = [];
  let elapsed = 0;
  let holdIndex = 0;

  for (const [index, line] of lines.entries()) {
    out.push(line);

    if (!line.startsWith('duration ')) {
      continue;
    }

    elapsed += Number.parseFloat(line.slice('duration '.length));
    const hold = holds[holdIndex];

    if (hold && elapsed >= hold.until) {
      out.push(lines[index - 1] ?? '');
      out.push(`duration ${hold.extend.toFixed(4)}`);
      holdIndex += 1;
    }
  }

  return `${out.join('\n')}\n`;
};

export const buildMaster = async (
  request: MasterRequest,
): Promise<MasterResult> => {
  const { format, manifest, timings, variant, workDir } = request;
  const tag = `${String(variant.width)}x${String(variant.height)}`;

  const plans = planTimeline(manifest, timings);
  const cues = buildCues(timings, plans);
  const heldSeconds = plans.reduce(
    (total, plan) => total + plan.extendSeconds,
    0,
  );

  // --- Picture.
  const concatPath = join(request.captureDir, `frames.extended.${tag}.concat`);
  writeFileSync(
    concatPath,
    extendConcat(
      readFileSync(join(request.captureDir, 'frames.concat'), 'utf8'),
      plans,
    ),
    'utf8',
  );

  const reframe = ((): string => {
    if (request.reframe === 'none') {
      return `fps=${String(variant.fps)}`;
    }

    if (request.reframe === 'fit') {
      return [
        `fps=${String(variant.fps)}`,
        `scale=${String(variant.width)}:-2`,
        `pad=${String(variant.width)}:${String(variant.height)}:0:(oh-ih)/2:color=${format.brand.background}`,
      ].join(',');
    }

    const cropWidth = Math.round(
      (manifest.height * variant.width) / variant.height,
    );
    const keyframes = cropPath(
      manifest,
      plans,
      cropWidth,
      manifest.height,
      format.safeAreas.portrait,
    );

    return [
      `fps=${String(variant.fps)}`,
      `crop=${String(cropWidth)}:${String(manifest.height)}:'${cropExpression(keyframes, 'x')}':'${cropExpression(keyframes, 'y')}'`,
      `scale=${String(variant.width)}:-2`,
      `pad=${String(variant.width)}:${String(variant.height)}:0:(oh-ih)/2:color=${format.brand.background}`,
    ].join(',');
  })();

  const picturePath = join(workDir, `picture-${tag}.mp4`);

  await ffmpeg([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatPath,
    '-vf',
    `${reframe},format=${format.encode.pixelFormat}`,
    '-c:v',
    format.encode.videoCodec,
    '-profile:v',
    format.encode.profile,
    '-crf',
    String(format.encode.crf),
    picturePath,
  ]);

  // --- Narration, placed on THIS capture's timeline.
  const inputs: string[] = [];
  const filters: string[] = [];

  for (const [index, cue] of cues.entries()) {
    inputs.push(
      '-i',
      join(request.audioDir, timings.segments[index]?.file ?? ''),
    );
    const millis = Math.round(cue.startSeconds * 1000);
    filters.push(
      `[${String(index)}:a]adelay=${String(millis)}|${String(millis)}[a${String(index)}]`,
    );
  }

  const narrationPath = join(workDir, `narration-${tag}.wav`);
  const mixLabels = cues.map((_, index) => `[a${String(index)}]`).join('');

  await ffmpeg([
    ...inputs,
    '-filter_complex',
    // amix with normalize=0 preserves each clip's level, which keeps the narration
    // sounding even — but it also SUMS wherever clips overlap. The final loudnorm
    // guarantees the delivery target and the peak ceiling regardless of how the cues
    // land, so a cue-layout bug can never ship as a clipped master. It is still a
    // bug, and captions.ts warns about it.
    `${filters.join(';')};${mixLabels}amix=inputs=${String(cues.length)}:normalize=0:dropout_transition=0,` +
      `loudnorm=I=${String(format.audio.targetLufs)}:TP=${String(format.audio.truePeakDb)}:LRA=11[out]`,
    '-map',
    '[out]',
    '-ac',
    '2',
    '-ar',
    String(format.audio.sampleRate),
    '-c:a',
    'pcm_s16le',
    narrationPath,
  ]);

  let soundPath = narrationPath;

  if (request.musicPath) {
    // The bed sits far under narration and ducks further while anyone is speaking.
    const mixedPath = join(workDir, `mix-${tag}.wav`);

    await ffmpeg([
      '-i',
      narrationPath,
      '-stream_loop',
      '-1',
      '-i',
      request.musicPath,
      '-filter_complex',
      `[1:a]volume=${String(format.audio.musicBedDb)}dB[bed];` +
        '[bed][0:a]sidechaincompress=threshold=0.02:ratio=12:attack=20:release=400[ducked];' +
        '[0:a][ducked]amix=inputs=2:normalize=0:duration=first[out]',
      '-map',
      '[out]',
      '-ac',
      '2',
      '-ar',
      String(format.audio.sampleRate),
      '-c:a',
      'pcm_s16le',
      mixedPath,
    ]);

    soundPath = mixedPath;
  }

  // --- Overlays. Captions are PNG plates because this ffmpeg has neither libass
  // nor libfreetype; see cards.ts.
  const overlayInputs: string[] = [];
  const overlaySteps: string[] = [];
  let label = '[v0]';

  for (const [index, overlay] of request.overlays.entries()) {
    overlayInputs.push('-i', overlay.path);
    const next = `[ov${String(index)}]`;
    overlaySteps.push(
      `${label}[${String(index + 2)}:v]overlay=0:0:enable='between(t,${overlay.startSeconds.toFixed(2)},${overlay.endSeconds.toFixed(2)})'${next}`,
    );
    label = next;
  }

  const bodyPath = join(workDir, `body-${tag}.mp4`);

  await ffmpeg([
    '-i',
    picturePath,
    '-i',
    soundPath,
    ...overlayInputs,
    '-filter_complex',
    [
      `[0:v]null[v0]`,
      ...overlaySteps,
      `${label}format=${format.encode.pixelFormat}[v]`,
    ].join(';'),
    '-map',
    '[v]',
    '-map',
    '1:a',
    '-c:v',
    format.encode.videoCodec,
    '-profile:v',
    format.encode.profile,
    '-crf',
    String(format.encode.crf),
    '-c:a',
    'aac',
    '-b:a',
    format.encode.audioBitrate,
    '-shortest',
    bodyPath,
  ]);

  // --- Outro: identical on every video, appended rather than composited.
  const outroSeconds = format.cards.outro.durationSeconds;
  const outroClip = join(workDir, `outro-${tag}.mp4`);

  await ffmpeg([
    '-loop',
    '1',
    '-t',
    String(outroSeconds),
    '-i',
    request.outroPngPath,
    '-f',
    'lavfi',
    '-t',
    String(outroSeconds),
    '-i',
    `anullsrc=r=${String(format.audio.sampleRate)}:cl=stereo`,
    '-vf',
    `scale=${String(variant.width)}:${String(variant.height)},fps=${String(variant.fps)},format=${format.encode.pixelFormat}`,
    '-c:v',
    format.encode.videoCodec,
    '-profile:v',
    format.encode.profile,
    '-crf',
    String(format.encode.crf),
    '-c:a',
    'aac',
    '-b:a',
    format.encode.audioBitrate,
    outroClip,
  ]);

  const segments = join(workDir, `segments-${tag}.txt`);
  writeFileSync(segments, `file '${bodyPath}'\nfile '${outroClip}'\n`, 'utf8');

  await ffmpeg([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    segments,
    '-c',
    'copy',
    ...(format.encode.faststart ? ['-movflags', '+faststart'] : []),
    request.outputPath,
  ]);

  if (request.srtPath) {
    writeFileSync(request.srtPath, toSrt(cues), 'utf8');
  }

  return { cues, heldSeconds };
};
