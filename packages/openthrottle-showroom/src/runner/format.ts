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
  /**
   * Long-form only. A long-form script whose narration covers far less than this
   * is an outline rather than a script, which the validator warns about.
   */
  readonly minDurationSeconds?: number;
  /**
   * Shorts only: 55, not 60. The spoken-word budget is derived from this rather
   * than from `maxDurationSeconds` — a short that fills its whole runtime with
   * speech is over-narrated.
   */
  readonly targetDurationSeconds?: number;
  readonly width: number;
}

export interface SafeArea {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/** packages/openthrottle-showroom/src/runner -> repository root. */
export const repositoryRoot = (): string =>
  join(import.meta.dirname, '..', '..', '..', '..');

/**
 * Where every stage writes: `packages/openthrottle-showroom/output/<slug>/`.
 *
 * One definition on purpose. Each stage used to walk up from its own directory
 * with `join(import.meta.dirname, '..', 'output')`, which was correct while they
 * all sat one level under `tests/demo/` and silently wrong the moment they moved
 * one level deeper into `src/` — narration for a whole take landed in
 * `src/output/` and the assembler looked for it somewhere else entirely.
 * A stage that needs the output root asks for it here.
 *
 * @public
 */
export const outputRoot = (): string =>
  join(import.meta.dirname, '..', '..', 'output');

/**
 * Where an episode's **picture** lives: `output/<slug>/`.
 *
 * Frames, the concat list, the step manifest, the portrait pass and the per-beat
 * text dumps. Shared by every variant on purpose — all of an episode's variants
 * have the same beats and the same action column, so one recording serves all of
 * them. That is the entire economic case for A/B testing a video: you re-narrate,
 * you do not re-record.
 *
 * @public
 */
export const captureDir = (slug: string): string => join(outputRoot(), slug);

/**
 * Where one **take** lives: `output/<slug>/<variant>/`.
 *
 * Audio, timings, masters, captions and upload metadata — everything downstream
 * of the words. Two variants of an episode can be rendered from a single capture
 * without either overwriting the other.
 *
 * The render cache is deliberately NOT in here: it sits beside the capture and is
 * keyed on backend, model, voice and spoken text, so two variants that share a
 * sentence share the render. That is a real saving against hosted TTS, since
 * variants tend to differ at the open and the close rather than in the middle.
 *
 * @public
 */
export const takeDir = (slug: string, variant: string): string =>
  join(outputRoot(), slug, variant);

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
