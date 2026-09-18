import type { SkippedMetric } from './metric-registry.ts';

/**
 * @description The versioned report envelope shape. This is the contract later
 * tasks fill in (task 3: plan+task metrics, task 4: skill-usage, task 5:
 * model+agent-run, task 6: Markdown rendering + CLI flags) — the shape itself
 * is established here and should not need to change to accommodate them.
 */

/** Bumped whenever the envelope shape changes in a way a consumer must handle. */
export const REPORT_SCHEMA_VERSION = 1;

/**
 * `aggregate` is the safe default per the SKILL.md privacy contract. `identifiers` and `full` are
 * a DOCUMENTED OPT-IN surface for repo/project/branch names (`identifiers`) and, additionally,
 * titles (`full`) — see SKILL.md's privacy-contract table. No metric family varies by detail
 * level yet: selecting `identifiers` or `full` today only changes `detailLevel` in the envelope
 * and the Markdown header, and {@link describeDetailLevel} says so plainly rather than letting the
 * report imply it captured more than it did.
 */
export const DETAIL_LEVELS = {
  AGGREGATE: 'aggregate',
  FULL: 'full',
  IDENTIFIERS: 'identifiers',
} as const;

export type DetailLevel = (typeof DETAIL_LEVELS)[keyof typeof DETAIL_LEVELS];

/** Every valid `--detail` value, for CLI validation and help text. */
export const DETAIL_LEVEL_VALUES: readonly DetailLevel[] = [
  DETAIL_LEVELS.AGGREGATE,
  DETAIL_LEVELS.IDENTIFIERS,
  DETAIL_LEVELS.FULL,
];

/** True when `value` is one of {@link DETAIL_LEVEL_VALUES}. */
export function isDetailLevel(value: string): value is DetailLevel {
  return DETAIL_LEVEL_VALUES.some((level) => level === value);
}

/**
 * A one-line, honest note about what `detailLevel` actually changed about this run. Every level
 * says the same thing today (nothing varies by detail level yet) because no metric query branches
 * on it — this exists so the Markdown report never implies more was captured than the aggregate
 * default.
 */
export function describeDetailLevel(detailLevel: DetailLevel): string {
  switch (detailLevel) {
    case DETAIL_LEVELS.AGGREGATE:
      return 'aggregate: counts, sums, and distributions only — no titles, paths, or branch names.';
    case DETAIL_LEVELS.IDENTIFIERS:
      return (
        'identifiers: reserved for repo/project/branch names. No metric currently varies by ' +
        'detail level, so this run’s output is identical to aggregate.'
      );
    case DETAIL_LEVELS.FULL:
      return (
        'full: reserved for identifiers plus plan/task titles. No metric currently varies by ' +
        'detail level, so this run’s output is identical to aggregate.'
      );
  }
}

/** Default reporting window per SKILL.md: last 90 days, ending now. */
export const DEFAULT_WINDOW_DAYS = 90;

/** An explicit, bounded time window — the report never scans unbounded history. */
export interface ReportWindow {
  readonly since: string;
  readonly until: string;
}

/** The full versioned report envelope. */
export interface ReportEnvelope {
  /** Salted, non-reversible hash of the git author identity — dedupes without naming anyone. */
  readonly actorKey: string | null;
  readonly detailLevel: DetailLevel;
  readonly generatedAt: string;
  /** Filled in by the metric-family tasks; empty until they register queries. */
  readonly metrics: Readonly<Record<string, unknown>>;
  /** Max applied `schema_migrations.filename`, or null when the ledger is missing/empty. */
  readonly migrationHighWaterMark: string | null;
  /** `org/repo` derived from the git remote, or null when there is no remote (local-only repo). */
  readonly repoSlug: string | null;
  readonly schemaVersion: number;
  /** Every capability-probe miss that caused a metric (or envelope field) to be skipped. */
  readonly skipped: readonly SkippedMetric[];
  readonly window: ReportWindow;
}

/** `since`/`until` for the default trailing window, anchored on `now` (injectable for tests). */
export function defaultWindow(now: Date = new Date()): ReportWindow {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - DEFAULT_WINDOW_DAYS);

  return { since: since.toISOString(), until: now.toISOString() };
}

/** `--since`/`--until` overrides, before they are validated against the default window. */
export interface WindowOverrides {
  readonly since?: string;
  readonly until?: string;
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

/** Everything {@link buildEnvelope} needs beyond what it fills in itself (schemaVersion, generatedAt). */
export interface BuildEnvelopeInput {
  readonly actorKey: string | null;
  readonly detailLevel?: DetailLevel;
  readonly metrics: Readonly<Record<string, unknown>>;
  readonly migrationHighWaterMark: string | null;
  readonly repoSlug: string | null;
  readonly skipped: readonly SkippedMetric[];
  readonly window: ReportWindow;
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
