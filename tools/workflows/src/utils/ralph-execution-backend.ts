/**
 * @description Layer 2 — execution backend (runner): which process invokes each Ralph iteration.
 * Today only `cursor` (Cursor `cursor-agent` CLI) is implemented; additional backends register here
 * without forking `workflow-ralph`.
 */

/** Known backend ids; extend when adding a runner implementation. */
export const RALPH_EXECUTION_BACKEND_IDS = ['cursor'] as const;

/** @description Which CLI/process runs each agentic iteration. */
export type RalphExecutionBackendId = (typeof RALPH_EXECUTION_BACKEND_IDS)[number];

/** @description Default runner: Cursor agent CLI. */
export const WORKFLOW_RALPH_DEFAULT_BACKEND: RalphExecutionBackendId = 'cursor';

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
      `Execution backend (${source}) must be a non-empty string (e.g. ${WORKFLOW_RALPH_DEFAULT_BACKEND})`,
    );
  }
  if (!isRalphExecutionBackendId(normalized)) {
    throw new Error(
      `Unknown execution backend "${raw.trim()}". Supported: ${RALPH_EXECUTION_BACKEND_IDS.join(', ')}`,
    );
  }
  return normalized;
};
