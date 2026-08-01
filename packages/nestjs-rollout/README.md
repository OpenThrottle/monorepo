# @openthrottle/nestjs-rollout

**Rollout** is OpenThrottle's feature-flagging system. This package owns the rollout
domain: the TypeORM entity, the NestJS module, and `RolloutService` (CRUD plus
RBAC-aware, role-targeted evaluation).

> Terminology: **rollout** = feature flags (this package). **clutch** = the Agentic
> Chat & harness (a separate, unrelated system — named only to avoid collisions).

## Flag model

A flag is a `key` (unique, kebab/dotted string), a `description`, an `enabled`
boolean, and `targetRoles` (RBAC role names).

Evaluation is locked:

> A flag is **on** for an actor when `enabled === true` **and** (`targetRoles` is
> empty ⇒ everyone, else the actor holds ≥1 of `targetRoles`).

Role targeting resolves the actor's roles via `RolesService`
(`@openthrottle/nestjs-repositories`), branching on `principal.kind` (user vs
service account) exactly like the app's `GqlPermissionsGuard`.

## Consuming `RolloutService`

Server-side code checks a single flag:

```ts
import { RolloutService } from '@openthrottle/nestjs-rollout';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';

@Injectable()
class BillingService {
  constructor(private readonly rollout: RolloutService) {}

  async run(principal: AuthPrincipal): Promise<void> {
    if (await this.rollout.isEnabled('billing.invoices', principal)) {
      // gated behaviour
    }
  }
}
```

`evaluateAll(principal)` returns every flag with its evaluated boolean — it backs
the `myFeatureFlags` GraphQL query.

To use the service, import `RolloutFlagsModule` (it registers the repository and
imports `NestjsRepositoriesModule` for `RolesService`):

```ts
import { RolloutFlagsModule } from '@openthrottle/nestjs-rollout';

@Module({ imports: [RolloutFlagsModule] })
export class SomeModule {}
```

## RBAC integration

The admin surface is gated by the `flags:read` / `flags:write` permissions defined
in `@openthrottle/nestjs-rbac` (seeded into the DB by migration `085`). Reads and
the actor-scoped `myFeatureFlags` require `flags:read`; create/update/delete require
`flags:write`. admin holds both; user and viewer are read-only.

## Architecture boundary

The **package owns the domain** (entity, module, service). The **GraphQL resolver
lives in the app** (`applications/openthrottle-server/src/graphql/rollout/`) because
it depends on the app-local `GqlPermissionsGuard` — the app depends on packages, not
the reverse. This mirrors how `RolesService` (in `nestjs-repositories`) pairs with
`RolesResolver` (in the app).

The `rollout_flags` table comes from `databases/migrations/084`; `synchronize` is
off, so the entity mirrors the migration rather than driving it.

## Installation

Workspace-internal; consume via the workspace protocol:

```bash
pnpm add @openthrottle/nestjs-rollout
```
