import {
  WorkflowConfigModel,
  WorkflowConfigRunner,
} from '@openthrottle/openthrottle-agentic-workflow';

/** @description Default `--iterations` (before task override in `main()`). */
export const DEFAULT_ITERATIONS = 10;

/** @description Default `--model` when unset or `auto`. */
export const DEFAULT_MODEL: WorkflowConfigModel = 'auto';

/** @description Default `--prompt` path fragment. */
export const DEFAULT_PROMPT = '/agents/ralph';

/** @description Default `--backend` for workflow-ralph; aligned with `tools/workflows` / UI. */
export const DEFAULT_RUNNER: WorkflowConfigRunner = 'cursor';
