import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ModuleMetadata } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { describe, it, expect, beforeEach } from 'vitest';
import type {
  AgenticWorkflowExecuteGraphqlV2,
  AgenticWorkflowWorkerGraphqlAuth,
} from './agentic-workflow-worker-graphql';
import {
  AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
  AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
} from './agentic-workflow-worker-graphql';
import { NestjsAgenticWorkflowModule } from './nestjs-agentic-workflow.module';
import { NestjsAgenticWorkflowService } from './nestjs-agentic-workflow.service';

const workerAuthFixture = (): AgenticWorkflowWorkerGraphqlAuth => ({
  token: 'worker-test-token',
  url: 'http://localhost:6021/graphql',
});

/**
 * @description Typed executor stub for DI identity checks (must not be invoked in these tests).
 */
const createExecuteGraphqlV2Stub = (): AgenticWorkflowExecuteGraphqlV2 => {
  return async <TData, TVariables extends Record<string, unknown>>(
    _document: TypedDocumentNode<TData, TVariables>,
    _variables?: TVariables,
    _options?: ExecuteGraphqlOptionsV2,
  ): Promise<TData> => {
    throw new Error(
      'executeGraphqlV2 stub should not run in module registration tests',
    );
  };
};

const WORKER_GRAPHQL_URL = Symbol('WORKER_GRAPHQL_URL');

@Module({
  exports: [WORKER_GRAPHQL_URL],
  providers: [
    {
      provide: WORKER_GRAPHQL_URL,
      useValue: 'http://api.test/graphql',
    },
  ],
})
class WorkerGraphqlUrlStubModule {}

/**
 * @description Supplies {@link LoggerService} globally so nested dynamic modules resolve it under Vitest
 * (nested `LoggerModule` imports do not always merge with `TestingModule` the same way as in `NestFactory`).
 */
@Global()
@Module({
  exports: [LoggerService],
  providers: [
    {
      provide: LoggerService,
      useValue: createMock<LoggerService>(),
    },
  ],
})
class GlobalLoggerStubModule {}

/**
 * @description Compiles a testing module that includes agentic workflow registration plus global logger wiring.
 */
const compileAgenticWorkflowModule = async (
  imports: NonNullable<ModuleMetadata['imports']>,
): Promise<TestingModule> =>
  Test.createTestingModule({
    imports: [GlobalLoggerStubModule, ...(imports ?? [])],
  }).compile();

describe('NestjsAgenticWorkflowModule', () => {
  describe('register', () => {
    let executeGraphqlV2: AgenticWorkflowExecuteGraphqlV2;

    beforeEach(() => {
      executeGraphqlV2 = createExecuteGraphqlV2Stub();
    });

    it('resolves executor and worker GraphQL auth tokens', async () => {
      const workerGraphqlAuth = workerAuthFixture();
      const moduleRef = await compileAgenticWorkflowModule([
        NestjsAgenticWorkflowModule.register({
          executeGraphqlV2,
          workerGraphqlAuth,
        }),
      ]);

      expect(moduleRef.get(AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2)).toBe(
        executeGraphqlV2,
      );
      expect(moduleRef.get(AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH)).toBe(
        workerGraphqlAuth,
      );
    });

    it('resolves NestjsAgenticWorkflowService', async () => {
      const moduleRef = await compileAgenticWorkflowModule([
        NestjsAgenticWorkflowModule.register({
          executeGraphqlV2,
          workerGraphqlAuth: workerAuthFixture(),
        }),
      ]);

      expect(moduleRef.get(NestjsAgenticWorkflowService)).toBeInstanceOf(
        NestjsAgenticWorkflowService,
      );
    });
  });

  describe('registerAsync', () => {
    it('resolves tokens from useFactory without inject', async () => {
      const executeGraphqlV2 = createExecuteGraphqlV2Stub();
      const workerGraphqlAuth = workerAuthFixture();

      const moduleRef = await compileAgenticWorkflowModule([
        NestjsAgenticWorkflowModule.registerAsync({
          useFactory: async () => ({
            executeGraphqlV2,
            workerGraphqlAuth,
          }),
        }),
      ]);

      expect(moduleRef.get(AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2)).toBe(
        executeGraphqlV2,
      );
      expect(moduleRef.get(AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH)).toBe(
        workerGraphqlAuth,
      );
    });

    it('resolves tokens when useFactory uses inject', async () => {
      const executeGraphqlV2 = createExecuteGraphqlV2Stub();

      const moduleRef = await compileAgenticWorkflowModule([
        NestjsAgenticWorkflowModule.registerAsync({
          imports: [WorkerGraphqlUrlStubModule],
          inject: [WORKER_GRAPHQL_URL],
          useFactory: (url: string) => ({
            executeGraphqlV2,
            workerGraphqlAuth: {
              token: 'injected-worker-token',
              url,
            },
          }),
        }),
      ]);

      expect(moduleRef.get(AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH)).toEqual({
        token: 'injected-worker-token',
        url: 'http://api.test/graphql',
      });
      expect(moduleRef.get(AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2)).toBe(
        executeGraphqlV2,
      );
    });
  });
});
