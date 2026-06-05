/**
 * @description Layer 2 — execution backend (runner): which process invokes each Ralph iteration.
 * A single plan run uses **exactly one** runner for **all** iterations; no per-iteration switching.
 *
 * Implementation lives in `@openthrottle/openthrottle-agentic-utils`; this module keeps legacy names.
 */

import {
  DEFAULT_WORKFLOW_RUNNER,
  isWorkflowRunnerId,
  parseWorkflowRunnerId,
  WORKFLOW_RUNNER_IDS,
} from '@openthrottle/openthrottle-agentic-utils';
import { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';

/**
 * @deprecated Import {@link WORKFLOW_RUNNER_IDS} from `@openthrottle/openthrottle-agentic-utils` instead.
 */
export const RALPH_EXECUTION_BACKEND_IDS = WORKFLOW_RUNNER_IDS;

/**
 * @deprecated Import {@link WorkflowConfigRunner} from `@openthrottle/openthrottle-agentic-utils` instead.
 */
export type RalphExecutionBackendId = WorkflowConfigRunner;

/**
 * @deprecated Import {@link DEFAULT_WORKFLOW_RUNNER} from `@openthrottle/openthrottle-agentic-utils` instead.
 */
export const DEFAULT_RALPH_RUNNER: WorkflowConfigRunner =
  DEFAULT_WORKFLOW_RUNNER;

/**
 * @deprecated Import {@link isWorkflowRunnerId} from `@openthrottle/openthrottle-agentic-utils` instead.
 */
export const isRalphExecutionBackendId = isWorkflowRunnerId;

/**
 * @deprecated Import {@link parseWorkflowRunnerId} from `@openthrottle/openthrottle-agentic-utils` instead.
 */
export const parseRalphExecutionBackendId = parseWorkflowRunnerId;
