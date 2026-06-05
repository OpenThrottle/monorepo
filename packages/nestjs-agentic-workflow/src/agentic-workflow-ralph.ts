import { createWorkflowRalphOrchestrator } from '@openthrottle/openthrottle-agentic-ralph';
import type {
  WorkflowContext,
  WorkflowFailedReason,
  WorkflowFinishedReason,
  WorkflowOrchestrator,
  WorkflowRalphOrchestratorDeps,
} from '@openthrottle/openthrottle-agentic-ralph';
import { AgenticWorkflowBase } from './agentic-workflow-base';
import { AGENTIC_WORKFLOW_RALPH_ID } from './agentic-workflow-ralph-registration';

/**
 * @description Concrete Ralph workflow ({@link AgenticWorkflowBase} implementation).
 *
 * Holds ALL Ralph-specific knowledge: the stable id (`'ralph'`, {@link AGENTIC_WORKFLOW_RALPH_ID}),
 * the {@link WorkflowRalphOrchestratorDeps} (GraphQL executor + iteration runner + optional onChunk),
 * and wrapping `createWorkflowRalphOrchestrator` from `@openthrottle/openthrottle-agentic-ralph`.
 * The base stays workflow-agnostic; the orchestrator-by-default dispatcher resolves this by id and
 * calls {@link AgenticWorkflowRalph.createOrchestrator} — which yields exactly today's wiring.
 */
export class AgenticWorkflowRalph extends AgenticWorkflowBase<
  WorkflowFinishedReason,
  WorkflowFailedReason,
  WorkflowContext
> {
  readonly id = AGENTIC_WORKFLOW_RALPH_ID;

  constructor(private readonly deps: WorkflowRalphOrchestratorDeps) {
    super();
  }

  createOrchestrator(): WorkflowOrchestrator {
    return createWorkflowRalphOrchestrator(this.deps);
  }
}
