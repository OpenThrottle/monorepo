import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import type {
  AgenticWorkflowModuleAsyncOptions,
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
