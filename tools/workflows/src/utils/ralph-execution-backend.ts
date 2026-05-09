/**
 * @description Layer 2 — execution backend (runner): which process invokes each Ralph iteration.
 * A single plan run uses **exactly one** runner for **all** iterations; no per-iteration switching.
 * To use a different runner, start a new plan run / re-queue with that choice.
 *
 * Implemented today: `cursor` (Cursor `cursor-agent` CLI).
 * Reserved (CLI/env/defaults plumbed; spawn implementation pending in a follow-up task): `claude`
 * (Anthropic Claude Code CLI).
 *
 * Adding a runner: register the id below, implement spawn paths in `bin/run-iteration.ts`, and
 * keep CLI help text in `config/messages.ts` aligned.
 */

/** Known backend ids; extend when adding a runner implementation. */
export const RALPH_EXECUTION_BACKEND_IDS = ['claude', 'cursor'] as const;

/** @description Which CLI/process runs each agentic iteration. */
export type RalphExecutionBackendId =
  (typeof RALPH_EXECUTION_BACKEND_IDS)[number];

/** @description Default runner: Cursor agent CLI. */
export const DEFAULT_RALPH_RUNNER: RalphExecutionBackendId = 'cursor';

/**
 * @description Returns true when `value` is a supported {@link RalphExecutionBackendId}.
 */
export const isRalphExecutionBackendId = (
  value: string,
): value is RalphExecutionBackendId =>
  (RALPH_EXECUTION_BACKEND_IDS as readonly string[]).includes(value);

/**
 * @description Normalizes and validates a backend id from CLI, env, or defaults file.
 */
export const parseRalphExecutionBackendId = (
  raw: string,
  source: 'cli' | 'env' | 'file' = 'cli',
): RalphExecutionBackendId => {
  const normalized = raw.trim().toLowerCase();
  if (normalized === '') {
    throw new Error(
      `Execution backend (${source}) must be a non-empty string (e.g. ${DEFAULT_RALPH_RUNNER})`,
    );
  }
  if (!isRalphExecutionBackendId(normalized)) {
    throw new Error(
      `Unknown execution backend "${raw.trim()}". Supported: ${RALPH_EXECUTION_BACKEND_IDS.join(', ')}`,
    );
  }
  return normalized;
};
