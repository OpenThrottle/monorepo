/** @description Default `--backend` for workflow-ralph; aligned with `tools/workflows` / UI. */
export const DEFAULT_RALPH_RUNNER = 'cursor';

/** @description Default `--prompt` path fragment. */
export const DEFAULT_RALPH_PROMPT = '/agents/ralph';

/** @description Default `--iterations` (before task override in `main()`). */
export const DEFAULT_RALPH_ITERATIONS = 10;

/** @description Default `--model` when unset or `auto`. */
export const DEFAULT_RALPH_MODEL = 'auto';

/**
 * @description Execution backend id for `--backend`; keep aligned with `workflow-ralph --backend`
 * and {@link DEFAULT_RALPH_RUNNER}.
 */
export type WorkflowRunner = typeof DEFAULT_RALPH_RUNNER;
