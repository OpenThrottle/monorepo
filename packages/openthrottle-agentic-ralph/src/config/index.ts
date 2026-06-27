import {
  WorkflowConfigModel,
  WorkflowConfigRunner,
} from '@openthrottle/openthrottle-agentic-workflow';

/** @description Default `--iterations` (before task override in `main()`). */
export const DEFAULT_ITERATIONS = 10;

/** @description Default `--model` when unset or `auto`. */
export const DEFAULT_MODEL: WorkflowConfigModel = 'auto';

/** @description Default `--prompt` path fragment. */
export const DEFAULT_PROMPT = '/agents-ralph';

/** @description Default `--backend` for workflow-ralph; aligned with `tools/workflows` / UI. */
export const DEFAULT_RUNNER: WorkflowConfigRunner = 'cursor';

/**
 * @description Env var (milliseconds) capping the orchestrator's cumulative wall-clock across all
 * iterations. Bounds cost on a stuck plan where each iteration nearly hits its per-iteration timeout.
 * When unset/invalid, the orchestrator falls back to a derived ceiling
 * (`perIterationTimeoutMs × maxIterations`). Env-only; never read from `.workflow-ralph.json`.
 */
export const RALPH_MAX_TOTAL_MS_ENV = 'OPENTHROTTLE_RALPH_MAX_TOTAL_MS';

/**
 * @description Resolves the explicit cumulative wall-clock budget (ms) from {@link RALPH_MAX_TOTAL_MS_ENV}.
 * Returns `undefined` when unset, non-numeric, or non-positive so callers can fall back to a derived ceiling.
 */
export const resolveRalphMaxTotalMsFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): number | undefined => {
  const raw = env[RALPH_MAX_TOTAL_MS_ENV];
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  if (trimmed === '') {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
