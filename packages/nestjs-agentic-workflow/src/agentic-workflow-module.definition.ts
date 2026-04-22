import type { ModuleMetadata, Type } from '@nestjs/common';
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
export interface AgenticWorkflowModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  readonly inject?: Array<string | symbol | Type<unknown>>;
  readonly isGlobal?: boolean;
  readonly useFactory: (
    ...args: unknown[]
  ) =>
    | AgenticWorkflowRegistrationOptions
    | Promise<AgenticWorkflowRegistrationOptions>;
}
