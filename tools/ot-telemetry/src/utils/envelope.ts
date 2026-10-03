import {
  DEFAULT_WINDOW_DAYS,
  DETAIL_LEVEL_VALUES,
  DETAIL_LEVELS,
  REPORT_SCHEMA_VERSION,
} from '../config/index.ts';
import { DETAIL_LEVEL_DESCRIPTIONS } from '../data/data.copy.ts';
import type {
  BuildEnvelopeInput,
  DetailLevel,
  ReportEnvelope,
  ReportWindow,
  WindowOverrides,
} from '../types/index.ts';

/**
 * @description Builds the versioned report envelope and resolves its bounded time window. The
 * envelope shape ({@link ReportEnvelope}) is the contract every metric family fills in.
 */

/** True when `value` is one of {@link DETAIL_LEVEL_VALUES}. */
export function isDetailLevel(value: string): value is DetailLevel {
  return DETAIL_LEVEL_VALUES.some((level) => level === value);
}

/** The honest one-line note about what `detailLevel` changed about this run. */
export function describeDetailLevel(detailLevel: DetailLevel): string {
  return DETAIL_LEVEL_DESCRIPTIONS[detailLevel];
}

/** `since`/`until` for the default trailing window, anchored on `now` (injectable for tests). */
export function defaultWindow(now: Date = new Date()): ReportWindow {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - DEFAULT_WINDOW_DAYS);

  return { since: since.toISOString(), until: now.toISOString() };
}

/** Parses a CLI date string to an ISO instant, or throws a message naming the offending flag. */
function parseWindowBound(flag: '--since' | '--until', raw: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `${flag} "${raw}" is not a valid date. Use an ISO 8601 date or date-time (e.g. 2026-01-01 or 2026-01-01T00:00:00Z).`,
    );
  }
  return parsed.toISOString();
}

/**
 * Resolves the report window from CLI overrides, falling back to {@link defaultWindow} for any
 * bound not supplied. Throws when a supplied bound does not parse, or when the resolved window is
 * empty/inverted — a bad flag should fail loudly, not silently produce an empty report.
 */
export function resolveWindow(
  overrides: WindowOverrides,
  now: Date = new Date(),
): ReportWindow {
  const fallback = defaultWindow(now);
  const since = overrides.since
    ? parseWindowBound('--since', overrides.since)
    : fallback.since;
  const until = overrides.until
    ? parseWindowBound('--until', overrides.until)
    : fallback.until;

  if (new Date(since).getTime() >= new Date(until).getTime()) {
    throw new Error(`--since (${since}) must be before --until (${until}).`);
  }

  return { since, until };
}

/** Assembles the final envelope, stamping `schemaVersion` and `generatedAt`. */
export function buildEnvelope(input: BuildEnvelopeInput): ReportEnvelope {
  return {
    actorKey: input.actorKey,
    detailLevel: input.detailLevel ?? DETAIL_LEVELS.AGGREGATE,
    generatedAt: new Date().toISOString(),
    metrics: input.metrics,
    migrationHighWaterMark: input.migrationHighWaterMark,
    repoSlug: input.repoSlug,
    schemaVersion: REPORT_SCHEMA_VERSION,
    skipped: input.skipped,
    window: input.window,
  };
}
