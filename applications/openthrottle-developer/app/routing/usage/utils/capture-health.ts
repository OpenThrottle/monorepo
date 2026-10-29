import type { UsageCaptureHealthRowFragment } from '~/__generated__/graphql';

/** One (stream, source) row with its staleness resolved against a fixed "now". */
export interface CaptureHealthEntry {
  readonly key: string;
  readonly lastCapturedAt: string;
  readonly source: string;
  readonly stale: boolean;
  readonly stream: string;
}

/**
 * True when `lastCapturedAt` is older than `staleAfterMs` before `nowMs`. An
 * unreadable timestamp counts as stale: we cannot show that data arrived.
 */
export const isCaptureStale = (
  lastCapturedAt: string,
  nowMs: number,
  staleAfterMs: number,
): boolean => {
  const capturedMs = new Date(lastCapturedAt).getTime();

  if (Number.isNaN(capturedMs)) {
    return true;
  }

  return nowMs - capturedMs > staleAfterMs;
};

/**
 * Rows ordered stale-first, then by stream and source, each tagged with its
 * staleness. `nowMs` is a parameter (the loader's clock) so server and client
 * renders agree and tests stay deterministic.
 */
export const buildCaptureHealthEntries = (
  rows: readonly UsageCaptureHealthRowFragment[],
  nowMs: number,
  staleAfterMs: number,
): CaptureHealthEntry[] =>
  rows
    .map((row) => ({
      key: `${row.stream}:${row.source}`,
      lastCapturedAt: row.lastCapturedAt,
      source: row.source,
      stale: isCaptureStale(row.lastCapturedAt, nowMs, staleAfterMs),
      stream: row.stream,
    }))
    .sort(
      (a, b) =>
        Number(b.stale) - Number(a.stale) ||
        a.stream.localeCompare(b.stream) ||
        a.source.localeCompare(b.source),
    );
