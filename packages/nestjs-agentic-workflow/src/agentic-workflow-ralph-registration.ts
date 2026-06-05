/**
 * Stable registration id for the OpenThrottle Ralph agentic workflow. Align with
 * `WorkflowContext.kind` in `@openthrottle/openthrottle-agentic-ralph` (`'ralph'`).
 */
export const AGENTIC_WORKFLOW_RALPH_ID = `ralph`;

/**
 * Nest DI token for Ralph orchestrator dependencies (`executeGraphqlV2` + `iterationRunner`,
 * optional `onChunk`). The application provides this object — typically via `useFactory` merging
 * {@link AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2} with {@link AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH} and a
 * Cursor iteration runner from `@tools/workflows`.
 *
 * Value type: {@link WorkflowRalphOrchestratorDeps} from `@openthrottle/openthrottle-agentic-ralph`.
 */
export const AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS = Symbol(
  'AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS',
);
