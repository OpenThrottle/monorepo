import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import type { DetailLevel } from './envelope.ts';
import {
  DETAIL_LEVEL_VALUES,
  DETAIL_LEVELS,
  isDetailLevel,
} from './envelope.ts';

/**
 * @description The full `report.ts` CLI flag surface: `--since`/`--until` (bounded window
 * overrides), `--out` (where the two files land), `--detail` (the documented opt-in detail-level
 * surface), and `--format` (which file(s) get written). Defaults are chosen for the cautious case
 * — see each constant's doc comment.
 */

/** Which file(s) a run writes. `both` (the default) writes `report.json` and `report.md`. */
export const OUTPUT_FORMATS = {
  BOTH: 'both',
  JSON: 'json',
  MD: 'md',
} as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[keyof typeof OUTPUT_FORMATS];

const OUTPUT_FORMAT_VALUES: readonly OutputFormat[] = [
  OUTPUT_FORMATS.BOTH,
  OUTPUT_FORMATS.JSON,
  OUTPUT_FORMATS.MD,
];

function isOutputFormat(value: string): value is OutputFormat {
  return OUTPUT_FORMAT_VALUES.some((format) => format === value);
}

/**
 * Default output directory: a scratch path under the OS temp directory, deliberately NOT inside
 * this repo's working tree, so the default can never be accidentally `git add`ed. `--out`
 * overrides it; a caller who points `--out` inside the repo is on their own (see the `.gitignore`
 * entries added as a second line of defense for the bare filenames).
 */
export function defaultOutDir(): string {
  return join(tmpdir(), 'ot-telemetry-reports');
}

/** Parsed and validated CLI options for `report.ts`. */
export interface CliOptions {
  readonly detailLevel: DetailLevel;
  readonly format: OutputFormat;
  readonly outDir: string;
  readonly since: string | undefined;
  readonly until: string | undefined;
}

/** Thrown for any bad flag value; callers should print `.message` and exit non-zero. */
export class CliArgsError extends Error {}

/** Parses and validates `argv` (defaulting to `process.argv.slice(2)`) into {@link CliOptions}. */
export function parseCliArgs(
  argv: readonly string[] = process.argv.slice(2),
): CliOptions {
  let values: {
    detail?: string;
    format?: string;
    out?: string;
    since?: string;
    until?: string;
  };
  try {
    ({ values } = parseArgs({
      args: [...argv],
      options: {
        detail: { type: 'string' },
        format: { type: 'string' },
        out: { type: 'string' },
        since: { type: 'string' },
        until: { type: 'string' },
      },
      strict: true,
    }));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliArgsError(`could not parse CLI flags: ${detail}`);
  }

  const detailLevel = values.detail ?? DETAIL_LEVELS.AGGREGATE;
  if (!isDetailLevel(detailLevel)) {
    throw new CliArgsError(
      `--detail "${detailLevel}" is not valid. Use one of: ${DETAIL_LEVEL_VALUES.join(', ')}.`,
    );
  }

  const format = values.format ?? OUTPUT_FORMATS.BOTH;
  if (!isOutputFormat(format)) {
    throw new CliArgsError(
      `--format "${format}" is not valid. Use one of: ${OUTPUT_FORMAT_VALUES.join(', ')}.`,
    );
  }

  return {
    detailLevel,
    format,
    outDir: values.out ?? defaultOutDir(),
    since: values.since,
    until: values.until,
  };
}
