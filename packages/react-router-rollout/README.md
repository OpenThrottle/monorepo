# @openthrottle/react-router-rollout

Typed React Router client SDK for OpenThrottle **rollout** (feature flags): a
flag catalog, a root provider that hydrates evaluations, and hooks for nested
UI.

## Ownership boundary

| Layer                       | Package / location                                      | Owns                                                        |
| --------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| Domain + evaluation         | [`@openthrottle/nestjs-rollout`](../nestjs-rollout/)    | Entity, `RolloutService`, RBAC-aware evaluate / fallthrough |
| GraphQL API                 | `applications/openthrottle-server/src/graphql/rollout/` | `evaluateFeatureFlags` (public hydration), admin CRUD       |
| Client types + UI hydration | **this package**                                        | `defineRolloutFlags`, `RolloutProvider`, typed hooks        |

The **server is SSOT for runtime evaluation**. The **client catalog is SSOT for
TypeScript types** (which keys exist and what value type each returns). Admin
CRUD stays behind `flags:read` / `flags:write`; client hydration does not.

## Installation

**In this monorepo:** add `"@openthrottle/react-router-rollout": "workspace:^"` to
the consuming app’s `package.json`, then run `pnpm install` from the repository
root.

> [!Tip]
> This package is **private** to the workspace and is not published to a public
> registry. It is **source-first** (no `build` target; `main`/`types` point at
> `src/index.ts`).

Reference consumer: `openthrottle-developer` (`DeveloperRolloutProvider`,
`data.rollout-flags.ts`, `fetch-rollout-evaluations.ts`).

## Wire a second app

1. **Dependency** — `workspace:^` as above.
2. **Catalog** — declare all known flags in a `data/` file (not inline in
   components). Use `defineRolloutFlags({ ... })`.
3. **GraphQL document** — app-owned query for `evaluateFeatureFlags` (args:
   `applicationKey`, optional `anonymousId`). Run app codegen; **do not** import
   `__generated__` into this package.
4. **Fetch adapter** — implement `RolloutFetchEvaluations`: call the query,
   optionally attach `Authorization` when a JWT cookie exists (enrichment only).
5. **Anonymous id** — persist a stable client id (localStorage) and pass it as
   `anonymousId` / `identityKey` when unauthenticated so percentage splits are
   not random every refresh.
6. **Mount** — wrap the tree near other root providers with `RolloutProvider`:
   - `applicationKey={APP_NAME}` (string today; same prop name for a UUID later)
   - `flags={catalog}`
   - `fetchEvaluations={adapter}`
   - optional `cache`, `identityKey`, `anonymousId`
7. **Use** — `useRolloutFlag` / `useIsRolloutEnabled` under the provider.

## Flag catalog (`defineRolloutFlags`)

Kinds match the server / GraphQL enum: `boolean` | `string` | `number` | `json`.
Defaults must match the declared kind (runtime assert).

```ts
import { defineRolloutFlags } from '@openthrottle/react-router-rollout';

export const appRolloutFlags = defineRolloutFlags({
  'billing.invoices': { kind: 'boolean', defaultValue: false },
  'theme.mode': { kind: 'string', defaultValue: 'system' },
});

export type AppRolloutFlags = typeof appRolloutFlags;
```

Unknown keys fail typecheck on hook arguments when you pass `AppRolloutFlags`
(or `typeof appRolloutFlags`) as the catalog type argument.

## Provider

```tsx
import { RolloutProvider } from '@openthrottle/react-router-rollout';
import { APP_NAME } from '@openthrottle/react-router-utils';

<RolloutProvider
  anonymousId={anonymousId}
  applicationKey={APP_NAME}
  cache={{ storage: 'sessionStorage' }}
  fetchEvaluations={fetchRolloutEvaluations}
  flags={appRolloutFlags}
  identityKey={userId ?? anonymousId}
>
  {children}
</RolloutProvider>;
```

| Prop                 | Role                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `applicationKey`     | Per-app configuration key (`APP_NAME` / `window.env.APP_NAME` today). Sent to the fetcher and GraphQL; scoping may be log/stub until app UUIDs exist. **Keep this prop name** when swapping to a UUID. |
| `flags`              | Catalog from `defineRolloutFlags`.                                                                                                                                                                     |
| `fetchEvaluations`   | Injected adapter `(args) => Promise<RolloutEvaluation[]>`.                                                                                                                                             |
| `anonymousId`        | Forwarded to the fetch adapter for anon bucketing.                                                                                                                                                     |
| `identityKey`        | Cache / re-hydrate key; change on login/logout so auth enrichment reloads.                                                                                                                             |
| `cache`              | `{ storage?: 'memory' \| 'sessionStorage', ttlMs?: number }`. Default TTL: 5 minutes (`DEFAULT_ROLLOUT_CACHE_TTL_MS`).                                                                                 |
| `initialEvaluations` | Optional SSR/loader seed.                                                                                                                                                                              |
| `strict`             | Optional stricter catalog/server validation warnings.                                                                                                                                                  |

### Hydration behavior

- Before ready (and on network error): hooks return **catalog defaults**.
- Cache hit within TTL for the same `applicationKey` + identity skips the network.
- Catalog key missing on server → keep default (dev warn).
- Server key unknown to catalog → ignore.
- Kind / `valueJson` parse mismatch → keep default (dev warn).
- Authenticated requests soft-enrich targeting; **unauthenticated calls must still succeed** (public `evaluateFeatureFlags`, no `flags:read`).

`hydration.status`: `idle` | `loading` | `ready` | `error`.

## Hooks

Pass the catalog type so keys and return types stay in sync:

```tsx
import {
  useIsRolloutEnabled,
  useRollout,
  useRolloutFlag,
} from '@openthrottle/react-router-rollout';
import type { AppRolloutFlags } from '~/global/data/data.rollout-flags';

const enabled = useRolloutFlag<AppRolloutFlags>('billing.invoices'); // boolean
const theme = useRolloutFlag<AppRolloutFlags>('theme.mode'); // string
const invoicesOn = useIsRolloutEnabled<AppRolloutFlags>('billing.invoices');
// useIsRolloutEnabled<AppRolloutFlags>('theme.mode') // type error (non-boolean)

const { applicationKey, hydration, values } = useRollout<AppRolloutFlags>();
```

- Prefer `useRolloutFlag` / `useIsRolloutEnabled` in UI.
- Use `useRollout` for status / debugging.
- All hooks throw if used outside `RolloutProvider`.

## Fetch adapter shape

```ts
import type { RolloutFetchEvaluations } from '@openthrottle/react-router-rollout';

export const fetchRolloutEvaluations: RolloutFetchEvaluations = async (
  args,
) => {
  // Call evaluateFeatureFlags({ applicationKey, anonymousId })
  // Optionally attach Bearer token when present — never require flags:read.
  return evaluations; // { key, kind, valueJson, enabled, ... }[]
};
```

See `applications/openthrottle-developer/app/global/utils/fetch-rollout-evaluations.ts`.

## Related

- [`@openthrottle/nestjs-rollout`](../nestjs-rollout/README.md) — server domain + evaluation model
- [AGENTS.md](./AGENTS.md) — package invariants for agents
