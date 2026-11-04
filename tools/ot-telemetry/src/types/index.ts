import type pg from 'pg';

import type { DETAIL_LEVELS, OUTPUT_FORMATS } from '../config/index.ts';

/**
 * @description Types shared across ot-telemetry modules. A metric family's own result shape lives
 * beside its query in `utils/metrics/`; only contracts two or more modules depend on live here.
 * Every count shape below is a label plus a count — never a title, description, summary, or
 * requirements value.
 */

export type DetailLevel = (typeof DETAIL_LEVELS)[keyof typeof DETAIL_LEVELS];

export type OutputFormat = (typeof OUTPUT_FORMATS)[keyof typeof OUTPUT_FORMATS];

/** One category bucket and how many rows fall in it. */
export interface CategoryCount {
  readonly category: string;
  readonly count: number;
}

/** One free-form label (e.g. a hook name, agent type, privacy level, or outcome) and its count. */
export interface LabelCount {
  readonly count: number;
  readonly label: string;
}

/** One status bucket and how many rows fall in it. */
export interface StatusCount {
  readonly count: number;
  readonly status: string;
}

/** One tag slug (vocabulary, not work content) and how many rows carry it. */
export interface TagCount {
  readonly count: number;
  readonly tag: string;
}

/** A count plus which strategy produced it — surfaced in the report, never hidden. */
export interface WindowCount {
  readonly count: number;
  /** `daily_stats` when every day in the window was read from the aggregate table with no live component; `hybrid` when the aggregate covered only the interior and the edges were live-counted; `live` when the aggregate could not be used at all. */
  readonly source: 'daily_stats' | 'hybrid' | 'live';
}

/** An explicit, bounded time window — the report never scans unbounded history. */
export interface ReportWindow {
  readonly since: string;
  readonly until: string;
}

/** `--since`/`--until` overrides, before they are validated against the default window. */
export interface WindowOverrides {
  readonly since?: string;
  readonly until?: string;
}

/** A metric query that was not run because the capability probe found it unsatisfiable. */
export interface SkippedMetric {
  readonly name: string;
  readonly reason: string;
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

/** Everything `buildEnvelope` needs beyond what it fills in itself (schemaVersion, generatedAt). */
export interface BuildEnvelopeInput {
  readonly actorKey: string | null;
  readonly detailLevel?: DetailLevel;
  readonly metrics: Readonly<Record<string, unknown>>;
  readonly migrationHighWaterMark: string | null;
  readonly repoSlug: string | null;
  readonly skipped: readonly SkippedMetric[];
  readonly window: ReportWindow;
}

/** Parsed and validated CLI options. */
export interface CliOptions {
  readonly detailLevel: DetailLevel;
  readonly format: OutputFormat;
  readonly outDir: string;
  readonly since: string | undefined;
  readonly until: string | undefined;
}

/** A live, read-only Postgres session plus its password-redacted URL for logging. */
export interface ReadOnlyConnection {
  readonly client: pg.Pool;
  /** Ends the underlying connection. Safe to call once; idempotent double-close is not supported. */
  close(): Promise<void>;
  readonly sanitizedUrl: string;
}

/** Tables (and their columns) actually present in the `public` schema. */
export interface CapabilityProbe {
  /** True when `table` has every column in `columns` (an empty/omitted list only checks the table). */
  hasColumns(table: string, columns?: readonly string[]): boolean;
  /** True when `table` exists in the `public` schema. */
  hasTable(table: string): boolean;
  /** All tables discovered in the `public` schema. */
  readonly tables: ReadonlySet<string>;
}

/** The migration high-water mark, or why it could not be read. */
export interface MigrationHighWaterMarkResult {
  readonly migrationHighWaterMark: string | null;
  readonly skipped: readonly SkippedMetric[];
}

/** Tables/columns a metric query needs to be able to run at all. */
export interface MetricRequirement {
  /** Column names required per table, beyond mere table presence. */
  readonly columns?: Readonly<Record<string, readonly string[]>>;
  /** Tables that must exist in `public` for this query to run. */
  readonly tables: readonly string[];
}

/** Context handed to a registered metric query's `run`. */
export interface MetricContext {
  readonly client: pg.Pool;
  readonly probe: CapabilityProbe;
  readonly window: ReportWindow;
}

/** A single named metric family query, self-describing its data requirements. */
export interface MetricQuery<TResult> {
  /** Key this metric is written under in the envelope's `metrics` object. */
  readonly name: string;
  readonly requires: MetricRequirement;
  run(context: MetricContext): Promise<TResult>;
}

/** Result of running a batch of registered metric queries. */
export interface MetricRunResult {
  readonly metrics: Readonly<Record<string, unknown>>;
  readonly skipped: readonly SkippedMetric[];
}
