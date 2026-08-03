# @openthrottle/nestjs-rollout

**Rollout** is OpenThrottle's feature-flagging system. This package owns the rollout
domain: the TypeORM entity, the NestJS module, and `RolloutService` (CRUD plus
RBAC-aware typed evaluation with percentage fallthrough).

> Terminology: **rollout** = feature flags (this package). **clutch** = the Agentic
> Chat & harness (a separate, unrelated system — named only to avoid collisions).

## Flag model

A flag has:

- `key` — unique kebab/dotted string
- `description`, master `enabled` switch
- `targetRoles` — RBAC role names (empty ⇒ everyone eligible; else actor must hold ≥1)
- `kind` — `boolean` | `string` | `number` | `json`
- `variations` — ordered array of `{ name?, description?, value }` (≥2; value matches kind)
- `offVariation` — index returned when disabled or role gate fails
- `fallthrough` — `{ variations: [{ variation, weight }, ...] }` with integer weights
  0–100 that **must sum to 100** (validated on write)

Boolean flags default to LaunchDarkly-like variations `[{value:false},{value:true}]`,
`offVariation=0`, and 100% fallthrough on variation 1 (`true`).

## Evaluation

```text
disabled            → offVariation   (reason: off)
role gate miss      → offVariation   (reason: target_roles)
eligible            → fallthrough    (reason: fallthrough)
missing key         → false stand-in (reason: flag_not_found)
```

`evaluate(key, principal)` / `evaluateAll(principal)` return:

```ts
{
  key: string;
  kind: 'boolean' | 'string' | 'number' | 'json';
  value: /* typed variation value */ ;
  variationIndex: number;
  reason: 'off' | 'target_roles' | 'fallthrough' | 'flag_not_found';
}
```

### Non-sticky percentage bucketing

Fallthrough picks a variation by mapping the actor id into a 0–99 bucket:

1. Strip dashes from the principal UUID
2. Parse the last 8 hex digits as an integer
3. `bucket = idInt % 100`
4. Walk cumulative weight ranges `[0, w1)`, `[w1, w1+w2)`, …

This is a **stand-in for sticky hashing / assignment persistence** and will be
replaced later. A 50/50 even/odd split is just weights `[50, 50]` on the same math.

### `isEnabled`

For **boolean** flags, `isEnabled` returns the **resolved variation boolean**
(not merely “enabled ∧ roles”). Non-boolean flags return `false`.

## Consuming `RolloutService`

```ts
import { RolloutService } from '@openthrottle/nestjs-rollout';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';

@Injectable()
class BillingService {
  constructor(private readonly rollout: RolloutService) {}

  async run(principal: AuthPrincipal): Promise<void> {
    if (await this.rollout.isEnabled('billing.invoices', principal)) {
      // boolean convenience
    }
    const evaluation = await this.rollout.evaluate('theme', principal);
    // evaluation.value is the typed variation
  }
}
```

Import `RolloutFlagsModule` (registers the repository and imports
`NestjsRepositoriesModule` for `RolesService`):

```ts
import { RolloutFlagsModule } from '@openthrottle/nestjs-rollout';

@Module({ imports: [RolloutFlagsModule] })
export class SomeModule {}
```

## RBAC integration

Admin surface permissions `flags:read` / `flags:write` live in
`@openthrottle/nestjs-rbac` (seeded by migration `085`). Admin list/get
require `flags:read`; create/update/delete require `flags:write`. Client
hydration uses the public GraphQL query `evaluateFeatureFlags` (no
`flags:read`; soft-auth enriches targeting when a JWT/SA is present). The
legacy `myFeatureFlags` query stays behind `flags:read` and is deprecated.

## Architecture boundary

The **package owns the domain** (entity, module, service). The **GraphQL resolver
lives in the app** (`applications/openthrottle-server/src/graphql/rollout/`) because
it depends on the app-local `GqlPermissionsGuard`.

**React Router clients** hydrate via
[`@openthrottle/react-router-rollout`](../react-router-rollout/): typed catalog +
`RolloutProvider` / hooks against public `evaluateFeatureFlags`. That package is
SSOT for client types and UI hydration; this package remains SSOT for evaluation
math and persistence. See that README for `applicationKey` (`APP_NAME` today,
UUID-ready prop name) and anon/auth adopt steps.

Schema: `databases/migrations/084` (table) + `089` (typed variations / fallthrough).
`synchronize` is off — the entity mirrors migrations.

## Installation

Workspace-internal; consume via the workspace protocol:

```bash
pnpm add @openthrottle/nestjs-rollout
```
