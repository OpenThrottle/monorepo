import type { ModuleMetadata, Provider, Type } from '@nestjs/common';
import type { AnyAgenticWorkflow } from './agentic-workflow-base';
import type {
  AgenticWorkflowExecuteGraphqlV2,
  AgenticWorkflowWorkerGraphqlAuth,
} from './agentic-workflow-worker-graphql';

/**
 * @description Values bound to {@link AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH} and {@link AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2}.
 * The server assembles both: workers have no HTTP session, so credentials and the executor are explicit.
 */
export interface AgenticWorkflowRegistrationOptions {
  readonly executeGraphqlV2: AgenticWorkflowExecuteGraphqlV2;
  readonly workerGraphqlAuth: AgenticWorkflowWorkerGraphqlAuth;
}

/**
 * @description Async registration using a factory (for example {@link ConfigService}-backed env).
 */
export interface AgenticWorkflowModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  readonly inject?: Array<string | symbol | Type<unknown>>;
  readonly isGlobal?: boolean;
  readonly useFactory: (
    ...args: unknown[]
  ) =>
    | AgenticWorkflowRegistrationOptions
    | Promise<AgenticWorkflowRegistrationOptions>;
}

/**
 * @description One workflow entry for `NestjsAgenticWorkflowModule.registerWorkflow`.
 * Each entry contributes an {@link AgenticWorkflowBase} implementation (resolved by an injected
 * factory) into the workflow registry, keyed by {@link AgenticWorkflowBase.id}. The factory may
 * inject Nest providers (for example the per-workflow deps token) declared in `inject`.
 *
 * The contract leaves room for `AgenticWorkflow<X>` later: register additional entries side-by-side
 * without changing the dispatcher, which always resolves a workflow by id from the registry.
 */
export interface AgenticWorkflowEntry {
  readonly inject?: Array<string | symbol | Type<unknown>>;
  /**
   * Factory that builds the workflow from its injected `inject` providers. Typed parameters are
   * accepted (the `never[]` rest signature is contravariantly compatible under strict function types).
   */
  readonly useFactory: (
    ...args: never[]
  ) => AnyAgenticWorkflow | Promise<AnyAgenticWorkflow>;
}

/**
 * @description Options for `NestjsAgenticWorkflowModule.registerWorkflow`: the standard worker
 * GraphQL registration plus the per-workflow providers and entries that populate the registry.
 */
export interface AgenticWorkflowRegisterWorkflowOptions
  extends AgenticWorkflowRegistrationOptions, Pick<ModuleMetadata, 'imports'> {
  readonly isGlobal?: boolean;
  /**
   * Extra providers needed to construct the workflows (for example the per-workflow deps token
   * the workflow factory injects).
   */
  readonly providers?: Provider[];
  /**
   * Workflows to register into the registry, keyed by {@link AgenticWorkflowBase.id}.
   */
  readonly workflows: readonly AgenticWorkflowEntry[];
}
