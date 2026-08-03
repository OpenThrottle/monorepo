# @openthrottle/nestjs-rollout — agent notes

Rollout is OpenThrottle's feature-flagging domain: the `RolloutFlag` entity,
`RolloutFlagsModule`, and `RolloutService` (CRUD + typed evaluate + role targeting

- percentage fallthrough). Consumed server-side via `RolloutService.evaluate` /
  `isEnabled` and by the app's rollout GraphQL resolver. "Rollout" = feature flags;
  "clutch" (agentic chat) is unrelated.

## Layout

- [src/index.ts](src/index.ts) — public entry point (`@public`): `RolloutFlag`,
  `RolloutFlagData`, kind/variation/fallthrough/evaluation types +
  `ROLLOUT_FLAG_KIND` / `ROLLOUT_EVALUATION_REASON`, bucketing helpers,
  `RolloutFlagsModule`, `RolloutService`, and create/update input types.
- [src/modules/rollout-flags](src/modules/rollout-flags) — entity, constants,
  bucketing, module, service, and service unit tests (evaluation matrix + CRUD
  validation).

## Invariants & gotchas

- **Source-first**, no `build` target changes: `main`/`types` → `src/index.ts`.
- **Typed evaluation**: disabled → `off` / offVariation; role miss →
  `target_roles` / offVariation; eligible → `fallthrough` via principal id
  mod 100. `evaluateAll` returns `RolloutEvaluation[]` (not boolean pairs).
- **`isEnabled`**: for boolean flags returns the **resolved variation boolean**;
  non-boolean → `false`. Prefer `evaluate` for typed consumers.
- **Non-sticky bucketing**: `principalIdToBucket` = last 8 hex digits of UUID →
  `parseInt` → `% 100`. Stand-in for sticky hashing — do not add assignment
  tables here; that is a later plan.
- **Write validation**: ≥2 variations; values match kind; `offVariation` in
  range; fallthrough weights integers 0–100 summing to 100. Throws
  `BadRequestException`.
- **Actor branch mirrors `GqlPermissionsGuard`**: service accounts →
  `findRoleNamesByServiceAccountId`, users → `findRoleNamesByUserId`.
- **Schema from migrations.** `084` creates the table; `089` adds `kind`,
  `variations`, `off_variation`, `fallthrough` (jsonb on the flag row).
  `synchronize` is off.
- **Resolver lives in the app**, not here
  (`applications/openthrottle-server/src/graphql/rollout/`).
- **RBAC**: `flags:read` / `flags:write` in `@openthrottle/nestjs-rbac` + migration
  `085` must stay in sync.

## Pointers

- [README.md](README.md) — human-facing overview and usage.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout,
  `@public` tags, source-first pattern).
