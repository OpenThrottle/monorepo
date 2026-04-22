# Testing: agentic workflow in Nest workers

Use this folder’s helpers when you compile a Nest `TestingModule` for code that imports `NestjsAgenticWorkflowModule` or injects `AGENTIC_WORKFLOW_*` tokens (for example a BullMQ `WorkerHost` processor that calls an orchestrator service).

## Import

```typescript
import {
  compileAgenticWorkflowTestingModule,
  GlobalLoggerStubModule,
} from '@openthrottle/nestjs-agentic-workflow/testing';
```

Peer-style dev deps (your app test target should already have them): `@nestjs/testing`, `@golevelup/ts-vitest`, `@openthrottle/nestjs-modules`.

## Minimal module registration

Stub `executeGraphqlV2` so it is never invoked, and pass fixed worker auth:

```typescript
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import {
  NestjsAgenticWorkflowModule,
  type AgenticWorkflowExecuteGraphqlV2,
  type AgenticWorkflowWorkerGraphqlAuth,
} from '@openthrottle/nestjs-agentic-workflow';
import { compileAgenticWorkflowTestingModule } from '@openthrottle/nestjs-agentic-workflow/testing';

const workerGraphqlAuth: AgenticWorkflowWorkerGraphqlAuth = {
  token: 'test-token',
  url: 'http://localhost:6021/graphql',
};

const executeGraphqlV2: AgenticWorkflowExecuteGraphqlV2 = async <
  TData,
  TVariables extends Record<string, unknown>,
>(
  _document: TypedDocumentNode<TData, TVariables>,
  _variables?: TVariables,
  _options?: ExecuteGraphqlOptionsV2,
): Promise<TData> => {
  throw new Error('executeGraphqlV2 should not run in this test');
};

const moduleRef = await compileAgenticWorkflowTestingModule([
  NestjsAgenticWorkflowModule.register({
    executeGraphqlV2,
    workerGraphqlAuth,
  }),
]);
```

## Processor-level test outline

For a `@Processor(...)` class (BullMQ) you typically also:

1. Provide a mock `Queue` for `@InjectQueue(...)` if the processor injects it.
2. Stub domain services (`PlansService`, `NotificationsService`, etc.) with `useValue` / `createMock`.
3. Register `NestjsAgenticWorkflowModule` as above so `AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2` and `AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH` resolve.
4. Optionally register `AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS` when the processor under test calls a Ralph orchestrator service.

`compileAgenticWorkflowTestingModule` exists to prepend `GlobalLoggerStubModule`; without it, nested imports that expect `LoggerService` can fail to resolve under `Test.createTestingModule` alone.
