import type {
  WorkflowRunContext,
  WorkflowOrchestrator,
} from '@openthrottle/openthrottle-agentic-workflow';

/**
 * @description Workflow-agnostic pattern for an agentic workflow registered with Nest DI.
 *
 * A concrete workflow (for example `AgenticWorkflowRalph`) extends this base, declares a stable
 * {@link AgenticWorkflowBase.id}, and builds its {@link WorkflowOrchestrator} from injected
 * per-workflow dependencies. The orchestrator-by-default dispatcher resolves a workflow by id
 * through the {@link AGENTIC_WORKFLOW_REGISTRY} and calls {@link AgenticWorkflowBase.createOrchestrator}.
 *
 * This base MUST NOT reference any concrete-workflow specifics (no Ralph kind, deps token, or
 * iteration runner). It is parameterized only over the transport-free orchestrator contract from
 * `@openthrottle/openthrottle-agentic-workflow`, so future workflows can register side-by-side
 * without changing the dispatcher.
 *
 * Per repo rules: declared as an abstract class (concrete workflows extend it and DI resolves by id),
 * no default export, explicit return types.
 */
export abstract class AgenticWorkflowBase<
  WorkflowFinishedReason = unknown,
  WorkflowFailedReason = unknown,
  TContext extends WorkflowRunContext = WorkflowRunContext,
> {
  /**
   * @description Stable registration id for this workflow (for example `'ralph'`). The dispatcher
   * resolves a registered workflow by this id; it MUST be unique within a registry.
   */
  abstract readonly id: string;

  /**
   * @description Builds the concrete {@link WorkflowOrchestrator} for this workflow from the
   * workflow's injected dependencies. Implementations wrap their downstream orchestrator factory
   * (for example `createWorkflowRalphOrchestrator`) and keep all workflow-specific knowledge here.
   */
  abstract createOrchestrator(): WorkflowOrchestrator<
    WorkflowFinishedReason,
    WorkflowFailedReason,
    TContext
  >;
}

/**
 * @description A concrete {@link AgenticWorkflowBase} of any context shape. The registry is
 * workflow-agnostic and resolves by id, so its element type must accept workflows whose
 * `TContext` narrows {@link WorkflowRunContext} (for example Ralph's `WorkflowContext`).
 * `WorkflowOrchestrator` is contravariant in its context, so a single concrete element type
 * cannot otherwise hold workflows with differing contexts — `any` here is the registry escape
 * hatch (resolution is by id and the dispatcher narrows the orchestrator at the call site).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyAgenticWorkflow = AgenticWorkflowBase<unknown, unknown, any>;

/**
 * @description Read-only registry of {@link AgenticWorkflowBase} implementations keyed by
 * {@link AgenticWorkflowBase.id}. Bound under {@link AGENTIC_WORKFLOW_REGISTRY}; the dispatcher
 * resolves a workflow by id and throws an actionable error for an unknown id.
 */
export interface AgenticWorkflowRegistry {
  /**
   * @description Returns the registered workflow for `id`, or `undefined` when none is registered.
   */
  readonly get: (id: string) => AnyAgenticWorkflow | undefined;
  /**
   * @description All registered workflow ids (for diagnostics / unknown-id error messages).
   */
  readonly ids: () => readonly string[];
  /**
   * @description Returns the registered workflow for `id`, throwing when it is not registered.
   */
  readonly resolve: (id: string) => AnyAgenticWorkflow;
}

/**
 * @description Nest DI token for the {@link AgenticWorkflowRegistry}. Provided by
 * `NestjsAgenticWorkflowModule.registerWorkflow`; consumed by the orchestrator-by-default dispatcher.
 */
export const AGENTIC_WORKFLOW_REGISTRY = Symbol('AGENTIC_WORKFLOW_REGISTRY');

/**
 * @description Builds an {@link AgenticWorkflowRegistry} from the given workflows, keyed by id.
 * Throws on duplicate ids so misregistration fails loudly at module construction.
 */
export const createAgenticWorkflowRegistry = (
  workflows: readonly AnyAgenticWorkflow[],
): AgenticWorkflowRegistry => {
  const byId = new Map<string, AnyAgenticWorkflow>();

  for (const workflow of workflows) {
    if (byId.has(workflow.id)) {
      throw new Error(
        `Duplicate agentic workflow id registered: "${workflow.id}"`,
      );
    }
    byId.set(workflow.id, workflow);
  }

  return {
    get: (id) => byId.get(id),
    ids: () => [...byId.keys()],
    resolve: (id) => {
      const workflow = byId.get(id);
      if (!workflow) {
        const known = [...byId.keys()];
        throw new Error(
          `Unknown agentic workflow id: "${id}". Registered ids: ${
            known.length > 0 ? known.join(', ') : '(none)'
          }`,
        );
      }
      return workflow;
    },
  };
};
