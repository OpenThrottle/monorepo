import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Module } from '@nestjs/common';
import type {
  WorkflowOrchestrator,
  WorkflowRunResult,
} from '@openthrottle/openthrottle-agentic-workflow';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  AGENTIC_WORKFLOW_REGISTRY,
  AgenticWorkflowBase,
} from '../agentic-workflow-base';
import type { AgenticWorkflowRegistry } from '../agentic-workflow-base';
import type {
  AgenticWorkflowExecuteGraphqlV2,
  AgenticWorkflowWorkerGraphqlAuth,
} from '../agentic-workflow-worker-graphql';
import {
  AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
  AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
} from '../agentic-workflow-worker-graphql';
import { compileAgenticWorkflowTestingModule } from '../testing';
import { NestjsAgenticWorkflowModule } from './nestjs-agentic-workflow.module';

const TEST_WORKFLOW_DEPS = Symbol('TEST_WORKFLOW_DEPS');

/**
 * @description Workflow-agnostic test double; the dispatcher only needs id + createOrchestrator.
 */
class StubWorkflow extends AgenticWorkflowBase<'done', 'failed'> {
  constructor(
    readonly id: string,
    private readonly marker: string,
  ) {
    super();
  }

  createOrchestrator(): WorkflowOrchestrator<'done', 'failed'> {
    return {
      execute: async (): Promise<WorkflowRunResult<'done', 'failed'>> => ({
        exitCode: 0,
        reason: 'done',
        status: 'finished',
      }),
    };
  }

  describeMarker(): string {
    return this.marker;
  }
}

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

describe('NestjsAgenticWorkflowModule', () => {
  describe('register', () => {
    let executeGraphqlV2: AgenticWorkflowExecuteGraphqlV2;

    beforeEach(() => {
      executeGraphqlV2 = createExecuteGraphqlV2Stub();
    });

    it('resolves executor and worker GraphQL auth tokens', async () => {
      const workerGraphqlAuth = workerAuthFixture();
      const moduleRef = await compileAgenticWorkflowTestingModule([
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
  });

  describe('registerAsync', () => {
    it('resolves tokens from useFactory without inject', async () => {
      const executeGraphqlV2 = createExecuteGraphqlV2Stub();
      const workerGraphqlAuth = workerAuthFixture();

      const moduleRef = await compileAgenticWorkflowTestingModule([
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

      const moduleRef = await compileAgenticWorkflowTestingModule([
        NestjsAgenticWorkflowModule.registerAsync({
          imports: [WorkerGraphqlUrlStubModule],
          inject: [WORKER_GRAPHQL_URL],
          useFactory: (...args: unknown[]) => {
            const url = args[0] as unknown as string;

            return {
              executeGraphqlV2,
              workerGraphqlAuth: {
                token: 'injected-worker-token',
                url,
              },
            };
          },
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

  describe('registerWorkflow', () => {
    it('binds workflows into the registry and resolves by id', async () => {
      const executeGraphqlV2 = createExecuteGraphqlV2Stub();
      const workerGraphqlAuth = workerAuthFixture();

      const moduleRef = await compileAgenticWorkflowTestingModule([
        NestjsAgenticWorkflowModule.registerWorkflow({
          executeGraphqlV2,
          workerGraphqlAuth,
          workflows: [
            { useFactory: () => new StubWorkflow('ralph', 'ralph-marker') },
          ],
        }),
      ]);

      const registry = moduleRef.get<AgenticWorkflowRegistry>(
        AGENTIC_WORKFLOW_REGISTRY,
      );

      const resolved = registry.resolve('ralph');
      expect(resolved).toBeInstanceOf(StubWorkflow);
      expect((resolved as StubWorkflow).describeMarker()).toBe('ralph-marker');
      expect(registry.ids()).toEqual(['ralph']);
    });

    it('resolves an async workflow factory before building the registry', async () => {
      const moduleRef = await compileAgenticWorkflowTestingModule([
        NestjsAgenticWorkflowModule.registerWorkflow({
          executeGraphqlV2: createExecuteGraphqlV2Stub(),
          workerGraphqlAuth: workerAuthFixture(),
          workflows: [
            {
              useFactory: async () => new StubWorkflow('ralph', 'async-marker'),
            },
          ],
        }),
      ]);

      const registry = moduleRef.get<AgenticWorkflowRegistry>(
        AGENTIC_WORKFLOW_REGISTRY,
      );

      const resolved = registry.resolve('ralph');
      expect(resolved).toBeInstanceOf(StubWorkflow);
      expect((resolved as StubWorkflow).describeMarker()).toBe('async-marker');
      expect(registry.ids()).toEqual(['ralph']);
    });

    it('throws on unknown id from the resolved registry', async () => {
      const moduleRef = await compileAgenticWorkflowTestingModule([
        NestjsAgenticWorkflowModule.registerWorkflow({
          executeGraphqlV2: createExecuteGraphqlV2Stub(),
          workerGraphqlAuth: workerAuthFixture(),
          workflows: [{ useFactory: () => new StubWorkflow('ralph', 'm') }],
        }),
      ]);

      const registry = moduleRef.get<AgenticWorkflowRegistry>(
        AGENTIC_WORKFLOW_REGISTRY,
      );

      expect(() => registry.resolve('unknown')).toThrow(
        /Unknown agentic workflow id/,
      );
    });

    it('builds a workflow from an injected per-workflow deps token', async () => {
      const moduleRef = await compileAgenticWorkflowTestingModule([
        NestjsAgenticWorkflowModule.registerWorkflow({
          executeGraphqlV2: createExecuteGraphqlV2Stub(),
          providers: [{ provide: TEST_WORKFLOW_DEPS, useValue: 'deps-marker' }],
          workerGraphqlAuth: workerAuthFixture(),
          workflows: [
            {
              inject: [TEST_WORKFLOW_DEPS],
              useFactory: (marker: string) => new StubWorkflow('ralph', marker),
            },
          ],
        }),
      ]);

      const registry = moduleRef.get<AgenticWorkflowRegistry>(
        AGENTIC_WORKFLOW_REGISTRY,
      );

      expect((registry.resolve('ralph') as StubWorkflow).describeMarker()).toBe(
        'deps-marker',
      );
    });

    it('resolves multiple workflows side-by-side', async () => {
      const moduleRef = await compileAgenticWorkflowTestingModule([
        NestjsAgenticWorkflowModule.registerWorkflow({
          executeGraphqlV2: createExecuteGraphqlV2Stub(),
          workerGraphqlAuth: workerAuthFixture(),
          workflows: [
            { useFactory: () => new StubWorkflow('ralph', 'a') },
            { useFactory: () => new StubWorkflow('other', 'b') },
          ],
        }),
      ]);

      const registry = moduleRef.get<AgenticWorkflowRegistry>(
        AGENTIC_WORKFLOW_REGISTRY,
      );

      expect(registry.resolve('ralph').id).toBe('ralph');
      expect(registry.resolve('other').id).toBe('other');
    });
  });
});
