import type { DataSourceOptions, ObjectLiteral } from 'typeorm';

import type {
  POSTGRES_EXPLAIN_OPTIONS,
  POSTGRES_PROFILING_MODES,
} from './postgres-profiling.constants.ts';

export type PostgresExplainOption =
  (typeof POSTGRES_EXPLAIN_OPTIONS)[keyof typeof POSTGRES_EXPLAIN_OPTIONS];

export type PostgresProfilingMode =
  (typeof POSTGRES_PROFILING_MODES)[keyof typeof POSTGRES_PROFILING_MODES];

/**
 * Per-method overrides. Whether ANALYZE runs is an environment decision
 * (`POSTGRES_PROFILING_ANALYZE`), so a method can only opt out of it, never force it on.
 */
export interface PostgresProfilingMethodOverrides {
  /** `false` keeps this method on the estimate-only `EXPLAIN` even when the env enables ANALYZE. */
  readonly analyze?: false;
}

/** One `Class.method` entry from `POSTGRES_PROFILING_TARGETS`; either segment may be `*`. */
export interface PostgresProfilingTarget {
  readonly className: string;
  readonly methodName: string;
  /** The trimmed entry as written, used when logging which targets are active. */
  readonly source: string;
}

export interface PostgresProfilingDisabledSettings {
  readonly enabled: false;
}

export interface PostgresProfilingLoggerOutput {
  readonly mode: 'logger';
}

export interface PostgresProfilingFileOutput {
  readonly mode: 'file';
  readonly outputDir: string;
}

export type PostgresProfilingOutput =
  PostgresProfilingFileOutput | PostgresProfilingLoggerOutput;

export interface PostgresProfilingEnabledSettings {
  /** From `POSTGRES_PROFILING_ANALYZE`; a method can still opt out with `analyze: false`. */
  readonly analyze: boolean;
  /** From `POSTGRES_PROFILING_DEDUPE_SECONDS`; `0` explains every execution. */
  readonly dedupeWindowSeconds: number;
  readonly enabled: true;
  /** The trimmed `POSTGRES_PROFILING_DEDUPE_SECONDS` value when it was not a non-negative integer; the default window is used. */
  readonly invalidDedupeSeconds?: string;
  /** The trimmed `POSTGRES_PROFILING_MIN_DURATION_MS` value when it was not a non-negative integer; `0` is used. */
  readonly invalidMinDurationMs?: string;
  /** The trimmed `POSTGRES_PROFILING_MODE` value when it was neither `logger` nor `file`; `logger` is used. */
  readonly invalidMode?: string;
  /** Entries that were not `*` and not `Class.method`; they are ignored. */
  readonly invalidTargets: readonly string[];
  /** From `POSTGRES_PROFILING_MIN_DURATION_MS`; calls faster than this are not explained, `0` explains every call. */
  readonly minDurationMs: number;
  readonly output: PostgresProfilingOutput;
  readonly targets: readonly PostgresProfilingTarget[];
}

export type PostgresProfilingSettings =
  PostgresProfilingDisabledSettings | PostgresProfilingEnabledSettings;

export interface CapturedQuery {
  readonly parameters?: ObjectLiteral | unknown[];
  readonly query: string;
}

interface QueryCaptureSuccess<T> {
  readonly ok: true;
  readonly queries: readonly CapturedQuery[];
  readonly value: T;
}

interface QueryCaptureFailure {
  readonly error: unknown;
  readonly ok: false;
  readonly queries: readonly CapturedQuery[];
}

export type QueryCaptureResult<T> =
  QueryCaptureFailure | QueryCaptureSuccess<T>;

export type PostgresProfilingInnerLoggerOption = Extract<
  DataSourceOptions,
  { type: 'postgres' }
>['logger'];

/** One node of the plan tree. The index signature keeps fields not listed here. */
export interface PostgresExplainPlanNode {
  readonly [field: string]: unknown;
  readonly 'Actual Loops'?: number;
  readonly 'Actual Rows'?: number;
  readonly 'Actual Startup Time'?: number;
  readonly 'Actual Total Time'?: number;
  readonly Alias?: string;
  readonly Filter?: string;
  readonly 'Index Cond'?: string;
  readonly 'Index Name'?: string;
  readonly 'Join Type'?: string;
  readonly 'Node Type': string;
  readonly 'Plan Rows': number;
  readonly 'Plan Width': number;
  readonly Plans?: readonly PostgresExplainPlanNode[];
  readonly 'Relation Name'?: string;
  readonly 'Shared Hit Blocks'?: number;
  readonly 'Shared Read Blocks'?: number;
  readonly 'Sort Key'?: readonly string[];
  readonly 'Startup Cost': number;
  readonly 'Total Cost': number;
}

/** The single object inside `QUERY PLAN` for `EXPLAIN (FORMAT JSON)`. */
export interface PostgresExplainOutput {
  readonly [field: string]: unknown;
  readonly 'Execution Time'?: number;
  readonly Plan: PostgresExplainPlanNode;
  readonly 'Planning Time'?: number;
}

export interface PostgresExplainScanSummary {
  readonly alias?: string;
  readonly filter?: string;
  readonly indexCond?: string;
  readonly indexName?: string;
  readonly nodeType: string;
  readonly relation?: string;
}

export interface PostgresExplainSortSummary {
  readonly nodeType: string;
  readonly sortKey: readonly string[];
}

export interface PostgresExplainJoinSummary {
  readonly joinType: string;
  readonly nodeType: string;
}

export interface PostgresExplainSummary {
  /** Root `Actual Rows` (per loop; the root runs once). Present only for ANALYZE plans. */
  readonly actualRows?: number;
  /** Raw duration of the decorated method call that issued the statement; absent when not measured. */
  readonly durationMs?: number;
  /** `true` when the root actual and estimated row counts differ by 10x or more. */
  readonly estimateMiss?: boolean;
  readonly estimatedRows: number;
  readonly executionTimeMs?: number;
  readonly hasSeqScan: boolean;
  readonly joins: readonly PostgresExplainJoinSummary[];
  /** Single-line, greppable rendering of the fields above; the sink prefixes it with `Class.method`. */
  readonly line: string;
  readonly planningTimeMs?: number;
  readonly scans: readonly PostgresExplainScanSummary[];
  /** Root `Shared Hit Blocks`, already cumulative over the child nodes. */
  readonly sharedHitBlocks?: number;
  /** Root `Shared Read Blocks`, already cumulative over the child nodes. */
  readonly sharedReadBlocks?: number;
  readonly sorts: readonly PostgresExplainSortSummary[];
  readonly totalCost: number;
}

/** Carries the SQL text only; bound parameters stay out of logs and plan files. */
export interface PostgresExplainPlanEntry {
  readonly className: string;
  /** Whole-call duration of the decorated method, shared by every statement explained from that call. */
  readonly durationMs?: number;
  readonly methodName: string;
  /** The unwrapped `PostgresExplainOutput`, or the raw query result when its shape was unexpected. */
  readonly plan: unknown;
  readonly query: string;
}

export interface PostgresExplainQueryManager {
  query(query: string, parameters?: readonly unknown[]): Promise<unknown>;
}

export interface PostgresExplainCollectedNodes {
  readonly joins: PostgresExplainJoinSummary[];
  readonly scans: PostgresExplainScanSummary[];
  readonly sorts: PostgresExplainSortSummary[];
}

export interface PostgresProfilingRawEnv {
  readonly analyze: string | undefined;
  readonly dedupeSeconds: string | undefined;
  readonly minDurationMs: string | undefined;
  readonly mode: string | undefined;
  readonly outputDir: string | undefined;
  readonly profiling: string | undefined;
  readonly targets: string | undefined;
}

export interface CachedPostgresProfilingSettings {
  readonly rawEnv: PostgresProfilingRawEnv;
  readonly settings: PostgresProfilingSettings;
}

export interface ParsedPostgresProfilingDedupe {
  readonly invalidSeconds?: string;
  readonly seconds: number;
}

export interface ParsedPostgresProfilingMinDuration {
  readonly invalidMs?: string;
  readonly ms: number;
}

export interface ParsedPostgresProfilingOutput {
  readonly invalidMode?: string;
  readonly output: PostgresProfilingOutput;
}
