import { LoggerService } from '@openthrottle/nestjs-modules';

import type {
  PostgresExplainOption,
  PostgresProfilingSettings,
  PostgresProfilingTarget,
} from './postgres-profiling.types.ts';

/**
 * Shared Winston logger for every profiling sink. Pass
 * `{ context: POSTGRES_PROFILING_LOGGER_CONTEXT }` as the meta argument.
 */
export const POSTGRES_PROFILING_LOGGER = new LoggerService();

// Pattern matching regexes.
export const POSTGRES_EXPLAIN_ANALYZABLE_STATEMENT_PATTERN = /^[\s(]*SELECT\b/i;
export const POSTGRES_EXPLAIN_LOCKING_CLAUSE_PATTERN = /\bFOR\s+(?:UPDATE|NO\s+KEY\s+UPDATE|SHARE|KEY\s+SHARE)\b/i; // prettier-ignore
export const POSTGRES_EXPLAIN_SCAN_NODE_PATTERN = / Scan$/;
// `SELECT ... INTO` creates a table, so ANALYZE would run a write.
export const POSTGRES_EXPLAIN_SELECT_INTO_PATTERN = /\bINTO\b/i;
export const POSTGRES_EXPLAIN_STATEMENT_PATTERN = /^\s*EXPLAIN\b/i;
export const POSTGRES_EXPLAINABLE_STATEMENT_PATTERN = /^[\s(]*(?:SELECT|INSERT|UPDATE|DELETE|WITH|VALUES|MERGE)\b/i; // prettier-ignore
export const POSTGRES_PROFILING_DEDUPE_SECONDS_PATTERN = /^\d+$/;
export const POSTGRES_PROFILING_MIN_DURATION_MS_PATTERN = /^\d+$/;

export const POSTGRES_PROFILING_DEDUPE_MAX_ENTRIES = 1000;
export const POSTGRES_PROFILING_DEFAULT_DEDUPE_SECONDS = 300;
export const POSTGRES_PROFILING_DEFAULT_MIN_DURATION_MS = 0;
export const POSTGRES_PROFILING_DEFAULT_OUTPUT_DIR_NAME = '.postgres-profiling';
export const POSTGRES_PROFILING_LOGGER_CONTEXT = 'PostgresProfiling';
export const POSTGRES_PROFILING_MS_PER_SECOND = 1000;
export const POSTGRES_PROFILING_TARGET_SEGMENT_SEPARATOR = '.';
export const POSTGRES_PROFILING_TARGET_SEPARATOR = ',';
export const POSTGRES_PROFILING_TRUE_VALUE = 'true';
export const POSTGRES_PROFILING_WILDCARD = '*';

export const POSTGRES_EXPLAIN_OPTIONS = {
  ANALYZE: 'ANALYZE',
  BUFFERS: 'BUFFERS',
  FORMAT_JSON: 'FORMAT JSON',
  SUMMARY: 'SUMMARY',
} as const;

export const POSTGRES_EXPLAIN_ANALYZE_OPTIONS: readonly PostgresExplainOption[] =
  [
    POSTGRES_EXPLAIN_OPTIONS.ANALYZE,
    POSTGRES_EXPLAIN_OPTIONS.BUFFERS,
    POSTGRES_EXPLAIN_OPTIONS.SUMMARY,
    POSTGRES_EXPLAIN_OPTIONS.FORMAT_JSON,
  ];

export const POSTGRES_EXPLAIN_DEFAULT_OPTIONS: readonly PostgresExplainOption[] =
  [POSTGRES_EXPLAIN_OPTIONS.FORMAT_JSON, POSTGRES_EXPLAIN_OPTIONS.SUMMARY];

// Durations under this show one decimal; at or above it they round to whole milliseconds.
export const POSTGRES_EXPLAIN_DURATION_DECIMAL_BELOW_MS = 10;

export const POSTGRES_EXPLAIN_ESTIMATE_MISS_FACTOR = 10;

// Below this many rows on both sides a large ratio is noise.
export const POSTGRES_EXPLAIN_ESTIMATE_MISS_MIN_ROWS = 10;

export const POSTGRES_EXPLAIN_NODE_TYPES = {
  INCREMENTAL_SORT: 'Incremental Sort',
  SEQ_SCAN: 'Seq Scan',
  SORT: 'Sort',
} as const;

export const POSTGRES_EXPLAIN_SEQ_SCAN_NOTE = `Local tables are small, so a Seq Scan is a prompt to check for a missing index, not proof of one.`;

export const POSTGRES_EXPLAIN_SORT_NODE_TYPES: readonly string[] = [
  POSTGRES_EXPLAIN_NODE_TYPES.INCREMENTAL_SORT,
  POSTGRES_EXPLAIN_NODE_TYPES.SORT,
];

export const POSTGRES_PROFILING_MATCH_ALL_TARGET: PostgresProfilingTarget = {
  className: POSTGRES_PROFILING_WILDCARD,
  methodName: POSTGRES_PROFILING_WILDCARD,
  source: POSTGRES_PROFILING_WILDCARD,
};

/**
 * @public
 * @description Where explain plans go: the Winston logger or JSON files on disk.
 */
export const POSTGRES_PROFILING_MODES = {
  FILE: 'file',
  LOGGER: 'logger',
} as const;

export const POSTGRES_PROFILING_DISABLED_SETTINGS: PostgresProfilingSettings = {
  enabled: false,
};

/**
 * @public
 * @description Names of the environment variables that configure Postgres profiling.
 */
export const POSTGRES_PROFILING_ENV_VARS = {
  ANALYZE: 'POSTGRES_PROFILING_ANALYZE',
  DEDUPE_SECONDS: 'POSTGRES_PROFILING_DEDUPE_SECONDS',
  MIN_DURATION_MS: 'POSTGRES_PROFILING_MIN_DURATION_MS',
  MODE: 'POSTGRES_PROFILING_MODE',
  OUTPUT_DIR: 'POSTGRES_PROFILING_OUTPUT_DIR',
  PROFILING: 'POSTGRES_PROFILING',
  TARGETS: 'POSTGRES_PROFILING_TARGETS',
} as const;
