/**
 * @description Load the "0-60" format constants. `docs/marketing/format.json` is
 * the single source of truth; nothing in the pipeline hard-codes a resolution, a
 * frame rate or a LUFS target. Change the spec, and the runner follows.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface FormatSpec {
  readonly audio: {
    readonly duckDb: number;
    readonly musicBedDb: number;
    readonly narrationBitrate: string;
    readonly narrationCodec: string;
    readonly sampleRate: number;
    readonly targetLufs: number;
    readonly truePeakDb: number;
  };
  readonly brand: Readonly<Record<string, string>>;
  readonly cards: {
    readonly lowerThird: {
      readonly durationSeconds: number;
      readonly insetPx: number;
      readonly startSeconds: number;
    };
    readonly outro: {
      readonly durationSeconds: number;
      readonly primaryText: string;
      readonly secondaryText: string;
    };
  };
  readonly encode: {
    readonly audioBitrate: string;
    readonly container: string;
    readonly crf: number;
    readonly faststart: boolean;
    readonly pixelFormat: string;
    readonly profile: string;
    readonly videoCodec: string;
  };
  readonly formats: {
    readonly longform: FormatVariant;
    readonly short: FormatVariant;
  };
  readonly recording: {
    readonly colorScheme: 'dark' | 'light';
    readonly deviceScaleFactor: number;
    readonly viewport: { readonly height: number; readonly width: number };
  };
  readonly safeAreas: {
    readonly landscape: SafeArea;
    readonly portrait: SafeArea;
  };
}

export interface FormatVariant {
  readonly aspect: string;
  readonly chaptered: boolean;
  readonly fps: number;
  readonly height: number;
  readonly maxDurationSeconds: number;
  readonly width: number;
}

export interface SafeArea {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/** tests/demo/runner -> repository root. */
export const repositoryRoot = (): string =>
  join(import.meta.dirname, '..', '..', '..', '..', '..');

/**
 * Structural check on the parsed spec. A malformed or half-edited format.json
 * should fail here with the offending path named, rather than surfacing later as a
 * recording at the wrong resolution.
 */
const isFormatSpec = (value: unknown): value is FormatSpec => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate: Partial<Record<keyof FormatSpec, unknown>> = value;

  return (
    typeof candidate.audio === 'object' &&
    typeof candidate.brand === 'object' &&
    typeof candidate.cards === 'object' &&
    typeof candidate.encode === 'object' &&
    typeof candidate.formats === 'object' &&
    typeof candidate.recording === 'object' &&
    typeof candidate.safeAreas === 'object'
  );
};

export const loadFormat = (): FormatSpec => {
  const path = join(repositoryRoot(), 'docs', 'marketing', 'format.json');
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));

  if (!isFormatSpec(parsed)) {
    throw new Error(
      `${path}: not a valid format spec (missing a top-level section)`,
    );
  }

  return parsed;
};
