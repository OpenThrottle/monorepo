# @openthrottle/nestjs-rollout — agent notes

Rollout is OpenThrottle's feature-flagging domain: the `RolloutFlag` entity,
`RolloutFlagsModule`, and `RolloutService` (CRUD + role-targeted evaluation).
Consumed server-side via `RolloutService.isEnabled` and by the app's rollout
GraphQL resolver. "Rollout" = feature flags; "clutch" (agentic chat) is unrelated.

## Layout

- [src/index.ts](src/index.ts) — public entry point (`@public`): `RolloutFlag`,
  `RolloutFlagData`, `RolloutFlagsModule`, `RolloutService`, and the
  `CreateRolloutFlagInput` / `UpdateRolloutFlagInput` / `EvaluatedFlag` types.
- [src/modules/rollout-flags](src/modules/rollout-flags) — entity, module, service,
  and the service unit tests (evaluation matrix + CRUD).

## Invariants & gotchas

- **Source-first**, no `build` target changes: `main`/`types` → `src/index.ts`.
- **Evaluation is locked**: `!flag || !enabled ⇒ false`; empty `targetRoles ⇒ true`;
  else the actor must hold ≥1 targeted role. `isEnabled` and `evaluateAll` resolve
  roles lazily (only when a targeted, enabled flag needs them) and at most once.
- **Actor branch mirrors `GqlPermissionsGuard`**: service accounts →
  `findRoleNamesByServiceAccountId`, users → `findRoleNamesByUserId`. Keep these in
  sync if the guard's branching changes.
- **Schema comes from migrations, not the entity.** `rollout_flags` is defined in
  `databases/migrations/084`; `synchronize` is off. Changing a column means a new
  migration — the entity only mirrors it.
- **Resolver lives in the app, not here.** The GraphQL resolver is in
  `applications/openthrottle-server/src/graphql/rollout/` because it needs the
  app-local `GqlPermissionsGuard`. Don't move it into this package (would invert the
  app→package dependency direction).
- **RBAC coupling**: permissions `flags:read` / `flags:write` live in
  `@openthrottle/nestjs-rbac` (static map) and `databases/migrations/085` (DB grants).
  Both must stay in sync with each other.

## Pointers

- [README.md](README.md) — human-facing overview and usage.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout,
  `@public` tags, source-first pattern).
