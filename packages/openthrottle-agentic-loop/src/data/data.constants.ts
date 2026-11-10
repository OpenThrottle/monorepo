/** @description Worker re-invocations after a red validation when the caller gives none. */
export const DEFAULT_MAX_RETRIES = 2;

/** @description Upper clamp for `maxRetries` (docs/workflows/ot-loop-job.md § 6). */
export const MAX_RETRIES_CEILING = 5;

/** @description Lower clamp for `maxRetries`. */
export const MAX_RETRIES_FLOOR = 0;

/** @description A task with no requirements and fewer trimmed title+description chars than this is too thin to delegate (§ 4). */
export const THIN_TASK_MIN_CHARS = 60;

/** @description Summary written on a task blocked for being too thin (§ 4). */
export const THIN_TASK_BLOCK_SUMMARY = `task row too thin to delegate: add a description or acceptance criteria`;

/** @description Directory (relative to the worktree root) holding the worker result file (§ 5). */
export const RESULT_DIR_NAME = '.ot-loop';

/** @description Result file name inside `RESULT_DIR_NAME` (§ 5). */
export const RESULT_FILE_NAME = 'result.json';

/** @description Self-ignoring `.gitignore` body written into `RESULT_DIR_NAME`, so nothing in it can be staged (§ 5). */
export const RESULT_DIR_GITIGNORE = '*\n';

/** @description Schema version the result file must carry (§ 5). */
export const RESULT_SCHEMA_VERSION = 1;

/** @description Max trimmed `reason` length (§ 5). */
export const RESULT_REASON_MAX_CHARS = 2000;

/** @description Max follow-ups per result (§ 5). */
export const RESULT_FOLLOW_UPS_MAX = 10;

/** @description Max follow-up title length (§ 5). */
export const RESULT_FOLLOW_UP_TITLE_MAX_CHARS = 200;

/** @description Max follow-up description length (§ 5). */
export const RESULT_FOLLOW_UP_DESCRIPTION_MAX_CHARS = 4000;

/** @description Failure tail line cap for a retry prompt (§ 6). */
export const FAILURE_TAIL_MAX_LINES = 200;

/** @description Failure tail byte cap for a retry prompt (§ 6). */
export const FAILURE_TAIL_MAX_BYTES = 16 * 1024;

/** @description Exit code reported for a validation command killed by its timeout (matches `timeout(1)`). */
export const COMMAND_TIMEOUT_EXIT_CODE = 124;

/** @description Per-command validation timeout when the caller gives none (§ 6). */
export const DEFAULT_COMMAND_TIMEOUT_MS = 30 * 60 * 1000;

/** @description Grace between SIGTERM and SIGKILL when a command is killed. */
export const KILL_GRACE_MS = 5000;

/** @description Nx targets of the Nx default validation, in order (§ 6). */
export const NX_DEFAULT_TARGETS = ['lint', 'typecheck', 'test'] as const;

/** @description Per-command output kept in memory for the failure tail; far above what `tailForRetry` keeps. */
export const OUTPUT_BUFFER_MAX_CHARS = 128 * 1024;

/** @description Committed per-repository config, relative to the worktree root (§ 6). */
export const OT_LOOP_CONFIG_PATH = '.openthrottle/ot-loop.json';

/** @description Message of the `none` resolution result (§ 6). */
export const OT_LOOP_NEEDS_VALIDATION_MESSAGE = `OT Loop needs a validation command: set otLoop.validationCommands on the plan or add .openthrottle/ot-loop.json`;

/** @description Output batch flush threshold in bytes (§ 10). */
export const SINK_MAX_BYTES = 4 * 1024;

/** @description Output batch flush threshold in milliseconds (§ 10). */
export const SINK_MAX_MS = 2000;

/** @description Lockfile to package-manager runner, first hit wins (§ 6). */
export const LOCKFILE_RUNNERS = [
  { file: 'pnpm-lock.yaml', runner: 'pnpm' },
  { file: 'package-lock.json', runner: 'npx' },
  { file: 'yarn.lock', runner: 'yarn' },
] as const;

/** @description Runner used for the Nx default when no lockfile is found. */
export const FALLBACK_RUNNER = 'npx';
