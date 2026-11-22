/**
 * @description The ffmpeg arguments for the whole-take path: one normalise pass
 * over the take, then a filter-free cut per sentence.
 */

export interface NormalizeArgsOptions {
  /** The loudnorm filter built from ONE measurement of the raw take. */
  readonly audioFilter: string;
  readonly input: string;
  readonly output: string;
  /** format.json's `audio.sampleRate`; the raw take is at Fish's 44100. */
  readonly sampleRate: number;
}

export interface SliceArgsOptions {
  readonly endSeconds: number;
  /** The NORMALISED take: already at gain and at format.json's rate. */
  readonly input: string;
  readonly output: string;
  readonly startSeconds: number;
}

/**
 * @description One pass: the single loudnorm gain and the resample, producing the
 * normalised take.
 */
export const buildNormalizeArgs = (options: NormalizeArgsOptions): string[] => {
  return [
    '-hide_banner',
    '-nostdin',
    '-loglevel',
    'error',
    '-y',
    '-i',
    options.input,
    '-af',
    options.audioFilter,
    '-ar',
    String(options.sampleRate),
    '-c:a',
    'pcm_s16le',
    options.output,
  ];
};

/**
 * @description Cut one clip out of the normalised take. No filter and no resample:
 * the gain was applied once, to the whole take. `-ss`/`-to` follow `-i`, so the cut
 * is sample-accurate rather than keyframe-snapped.
 */
export const buildSliceArgs = (options: SliceArgsOptions): string[] => {
  return [
    '-hide_banner',
    '-nostdin',
    '-loglevel',
    'error',
    '-y',
    '-i',
    options.input,
    '-ss',
    options.startSeconds.toFixed(6),
    '-to',
    options.endSeconds.toFixed(6),
    '-c:a',
    'pcm_s16le',
    options.output,
  ];
};
