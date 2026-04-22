# @openthrottle/nestjs-agentic-workflow

NestJS wiring for OpenThrottle agentic workflows: DI tokens for **worker-scoped GraphQL auth** (no HTTP session in BullMQ workers) and an **`executeGraphqlV2`-compatible executor**. Re-exports core workflow types from `@openthrottle/openthrottle-agentic-workflow`.

## Dependency direction

| Layer | Role |
| --- | --- |
| `@openthrottle/openthrottle-agentic-workflow` | Shared contracts only (orchestrator shapes, run results). No Nest, GraphQL transport, or database. |
| **This package** | Nest `DynamicModule` registration, injection tokens (`AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH`, `AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2`). No Ralph, no Postgres. |
| App / `@openthrottle/openthrottle-server` | Supplies real auth (env, secrets, service token) and binds `executeGraphqlV2` from `@openthrottle/nodejs-graphql`. |

Consumers import `NestjsAgenticWorkflowModule.register` or `registerAsync` and implement the factory in the server layer so credentials never hard-code inside this library.

## Installation

**pnpm (preferred in this monorepo):**

```bash
pnpm add @openthrottle/nestjs-agentic-workflow
```

## Registration

Use **`register`** when URL, bearer token, and executor are known synchronously. Prefer **`registerAsync`** when loading from `ConfigService`, Vault, or other async Nest providers.

### `registerAsync` (recommended for the server)

The server’s `useFactory` must return **`workerGraphqlAuth`** (defaults merged into each `executeGraphqlV2` call) and **`executeGraphqlV2`** (typically `executeGraphqlV2` from `@openthrottle/nodejs-graphql`, optionally wrapped).

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';
import { executeGraphqlV2 } from '@openthrottle/nodejs-graphql';
import {
  NestjsAgenticWorkflowModule,
  type AgenticWorkflowRegistrationOptions,
} from '@openthrottle/nestjs-agentic-workflow';

@Module({
  imports: [
    ConfigModule,
    NestjsAgenticWorkflowModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        config: ConfigService,
      ): AgenticWorkflowRegistrationOptions => ({
        workerGraphqlAuth: {
          token: config.get<string>('WORKER_GRAPHQL_TOKEN', ''),
          url: config.get<string>('GRAPHQL_URL', ''),
        },
        executeGraphqlV2,
      }),
    }),
  ],
})
export class AppModule {}
```

Replace placeholder env keys with your operational names. Before production, swap any placeholder token for a secrets-managed or workload identity–issued credential.

### How the server supplies auth

Workers do not reuse browser or API-gateway sessions. The application must:

1. Build **`workerGraphqlAuth`** — same shape as `ExecuteGraphqlOptionsV2` (`url`, `token`, optional `headers`).
2. Expose **`executeGraphqlV2`** — codegen `TypedDocumentNode` operations only; merge `workerGraphqlAuth` as defaults when delegating to `@openthrottle/nodejs-graphql`.

Registration binds both to Nest providers so orchestrators and processors inject **`AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH`** and **`AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2`** explicitly.

## API surface

Exports include registration types, `@openthrottle/openthrottle-agentic-workflow` types (re-exported), tokens in `agentic-workflow-worker-graphql.ts`, and `NestjsAgenticWorkflowModule`.
