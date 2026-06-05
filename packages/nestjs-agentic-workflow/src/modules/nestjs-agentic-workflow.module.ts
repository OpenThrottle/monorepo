import type { DynamicModule, Provider } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import type { AnyAgenticWorkflow } from '../agentic-workflow-base';
import {
  AGENTIC_WORKFLOW_REGISTRY,
  createAgenticWorkflowRegistry,
} from '../agentic-workflow-base';
import type {
  AgenticWorkflowModuleAsyncOptions,
  AgenticWorkflowRegisterWorkflowOptions,
  AgenticWorkflowRegistrationOptions,
} from '../agentic-workflow-module.definition';
import {
  AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
  AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
} from '../agentic-workflow-worker-graphql';

const AGENTIC_WORKFLOW_REGISTRATION = Symbol('AGENTIC_WORKFLOW_REGISTRATION');

const moduleExports = [
  AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
  AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
];

@Module({})
export class NestjsAgenticWorkflowModule {
  /**
   * @description Registers worker GraphQL defaults and an `executeGraphqlV2`-compatible executor under the package tokens.
   */
  static register(
    options: AgenticWorkflowRegistrationOptions & {
      readonly isGlobal?: boolean;
    },
  ): DynamicModule {
    const { executeGraphqlV2, isGlobal, workerGraphqlAuth } = options;
    return {
      exports: [...moduleExports],
      global: isGlobal === true,
      imports: [LoggerModule],
      module: NestjsAgenticWorkflowModule,
      providers: [
        {
          provide: AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
          useValue: executeGraphqlV2,
        },
        {
          provide: AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
          useValue: workerGraphqlAuth,
        },
      ],
    };
  }

  /**
   * @description Registers worker GraphQL defaults plus one or more {@link AgenticWorkflowBase}
   * implementations into a workflow registry keyed by id, and exports {@link AGENTIC_WORKFLOW_REGISTRY}.
   *
   * The orchestrator-by-default dispatcher resolves a workflow by id from the registry; today only
   * the Ralph workflow is registered, but additional `AgenticWorkflow<X>` entries can be added
   * side-by-side WITHOUT changing the dispatcher. Each workflow is built by its `useFactory`
   * (which may inject the per-workflow deps token via `inject`), so all workflow-specific wiring
   * stays in the concrete workflow + its registration.
   */
  static registerWorkflow(
    options: AgenticWorkflowRegisterWorkflowOptions,
  ): DynamicModule {
    const {
      executeGraphqlV2,
      imports,
      isGlobal,
      providers = [],
      workerGraphqlAuth,
      workflows,
    } = options;

    const workflowTokens = workflows.map((_, index) =>
      Symbol(`AGENTIC_WORKFLOW_ENTRY_${index}`),
    );

    const workflowProviders: Provider[] = workflows.map((entry, index) => ({
      inject: entry.inject ?? [],
      provide: workflowTokens[index],
      useFactory: entry.useFactory,
    }));

    return {
      exports: [...moduleExports, AGENTIC_WORKFLOW_REGISTRY],
      global: isGlobal === true,
      imports: [LoggerModule, ...(imports ?? [])],
      module: NestjsAgenticWorkflowModule,
      providers: [
        ...providers,
        {
          provide: AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
          useValue: executeGraphqlV2,
        },
        {
          provide: AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
          useValue: workerGraphqlAuth,
        },
        ...workflowProviders,
        {
          inject: workflowTokens,
          provide: AGENTIC_WORKFLOW_REGISTRY,
          useFactory: (...resolved: AnyAgenticWorkflow[]) =>
            createAgenticWorkflowRegistry(resolved),
        },
      ],
    };
  }

  /**
   * @description Same as {@link NestjsAgenticWorkflowModule.register} when auth or executor come from async providers (env, vault, etc.).
   */
  static registerAsync(
    options: AgenticWorkflowModuleAsyncOptions,
  ): DynamicModule {
    return {
      exports: [...moduleExports],
      global: options.isGlobal === true,
      imports: [LoggerModule, ...(options.imports ?? [])],
      module: NestjsAgenticWorkflowModule,
      providers: [
        {
          inject: options.inject ?? [],
          provide: AGENTIC_WORKFLOW_REGISTRATION,
          useFactory: options.useFactory,
        },
        {
          inject: [AGENTIC_WORKFLOW_REGISTRATION],
          provide: AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
          useFactory: (registration: AgenticWorkflowRegistrationOptions) =>
            registration.executeGraphqlV2,
        },
        {
          inject: [AGENTIC_WORKFLOW_REGISTRATION],
          provide: AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
          useFactory: (registration: AgenticWorkflowRegistrationOptions) =>
            registration.workerGraphqlAuth,
        },
      ],
    };
  }
}
