import type { WorkflowRunnerId } from '../utils/workflow.ts';

export type WorkflowConfigDebug = 'debug' | 'omit' | 'verbose';
/**
 * Which CLI/process runs each agentic iteration.
 * @deprecated Use `DriverId` from `@openthrottle/openthrottle-drivers`.
 */
export type WorkflowConfigRunner = WorkflowRunnerId;
