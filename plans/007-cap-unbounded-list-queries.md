# Plan 007: Cap the unbounded list queries (embeddings + plan output stream)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
> When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9d10ccc6..HEAD -- applications/openthrottle-server/src/graphql/plan-embeddings applications/openthrottle-server/src/graphql/task-embeddings applications/openthrottle-server/src/graphql/plan-output-stream`
> On any change, re-verify the "Current state" excerpts; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED (GraphQL schema change + a deliberate behavior bound; see Step notes)
- **Depends on**: none (coordinate schema regeneration with plan 006 if both are in the PR)
- **Category**: perf
- **Planned at**: commit `9d10ccc6`, 2026-07-05

## Why this matters

Three list queries load **every** matching row into memory with no limit and return them all: `planEmbeddings`, `taskEmbeddings`, and `planOutputStreamChunks`. Embeddings and agent output chunks grow without bound as plans run and iterate; a single large plan can make these queries balloon API memory and response size. Every other list query in this server is bounded (e.g. `plans()` caps at `MAX_PLANS_LIMIT`, `listPlansByStatus` takes `limit`/`offset`). This plan brings the three outliers in line: optional `limit`/`offset` args plus a hard safety ceiling applied even when the caller passes nothing.

## Current state

Three unbounded resolvers, each doing `repository.find({ order: { createdAt: 'ASC' }, where: {...} })` with no `take`/`skip`:

- `applications/openthrottle-server/src/graphql/plan-embeddings/plan-embeddings.resolver.ts` — `planEmbeddings(input: PlanEmbeddingsByPlanInput)`:
  ```ts
  const entities = await this.planEmbeddingsService.getRepository().find({
    order: { createdAt: 'ASC' },
    where: { planId: input.planId },
  });
  return entities;
  ```
- `applications/openthrottle-server/src/graphql/task-embeddings/task-embeddings.resolver.ts` — `taskEmbeddings(input: TaskEmbeddingsByTaskInput)`:
  ```ts
  const entities = await this.taskEmbeddingsService
    .getRepository()
    .find({ order: { createdAt: 'ASC' }, where: { taskId: input.taskId } });
  return entities;
  ```
- `applications/openthrottle-server/src/graphql/plan-output-stream/plan-output-stream.resolver.ts` — `planOutputStreamChunks(input: ListPlanOutputStreamChunksInput)`:
  ```ts
  const entities = await this.planOutputStreamService.getRepository().find({
    order: { createdAt: 'ASC' },
    where: { planId: input.planId },
  });
  return entities;
  ```

The input types live next to each resolver: `plan-embeddings.input.ts` (`PlanEmbeddingsByPlanInput`), `task-embeddings.input.ts` (`TaskEmbeddingsByTaskInput`), `plan-output-stream.input.ts` (`ListPlanOutputStreamChunksInput`).

**Exemplar to copy** — bounded pattern already in this repo, `plans.resolver.ts`:

- Constants at top: `const MAX_PLANS_LIMIT = 500;` and a default; the resolver clamps with `Math.min(Math.max(1, limit ?? DEFAULT), MAX)`.
- `listPlansByStatus` applies `const take = input.limit ?? 20; const skip = input.offset ?? 0;` then `.take(take)` / `.skip(skip)` (here via `find`'s `take`/`skip` options).
- Optional GraphQL Int args use `@Field(() => Int, { nullable: true })` on the input class (or `@Args('limit', { nullable: true, type: () => Int })`).

**Schema impact**: adding optional args changes `applications/openthrottle-server/schema.gql` and requires regenerating consumer codegen (see Step 4). This is an ADDITIVE, backward-compatible schema change (new nullable args) — no field removed.

**Behavior note (reviewer decision)**: results are ordered `createdAt ASC` (oldest first). With a default ceiling, a caller passing no `limit` gets at most `MAX` rows — the OLDEST `MAX`. For any plan/task with more than `MAX` embeddings/chunks this is a behavior change (previously it returned all). The default ceiling is set high (see Step 2) so it does not bite typical data, and `offset` is provided for full pagination. This is the intended trade-off: bounded memory over unbounded returns.

## Commands you will need

| Purpose               | Command                                                                                              | Expected on success                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Typecheck             | `pnpm nx run openthrottle-server:typecheck`                                                          | exit 0                                                                  |
| Test                  | `pnpm nx run openthrottle-server:test`                                                               | all pass (incl. new tests)                                              |
| Regenerate app schema | boot the server once (`pnpm nx run openthrottle-server:dev`), wait for the running banner, then stop | `applications/openthrottle-server/schema.gql` updated with the new args |
| Regenerate consumers  | `pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel`                          | exit 0                                                                  |
| Lint                  | `pnpm nx run openthrottle-server:lint`                                                               | exit 0                                                                  |

## Scope

**In scope**:

- The three resolver files and their three input files (add args + apply `take`/`skip` + ceiling).
- Test files for the three (create or extend `*.resolver.test.ts` in each folder).
- `applications/openthrottle-server/schema.gql` (regenerated) and any consumer `__generated__` output the codegen step updates.

**Out of scope** (do NOT touch):

- The single-item queries (`planEmbedding`, `planOutputStreamChunk`, etc.) — they already take an `id`.
- The subscription resolvers in `plan-output-stream` — unrelated.
- Repository/entity definitions in `packages/nestjs-repositories`.

## Git workflow

- Work on the single shared PR branch the operator assigns.
- Commit style: conventional commits, no attribution. Example: `perf(openthrottle-server): bound unbounded embedding/output-stream list queries`.
- Commit the regenerated `schema.gql` and `__generated__` outputs together with the code.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add optional `limit`/`offset` to the three input types

In each input class add two optional Int fields following the repo pattern (match how `list-plans-by-status.input.ts` declares them — read it first). Example shape:

```ts
@Field(() => Int, { nullable: true, description: 'Max rows to return (default and hard cap: 1000).' })
limit?: number | null;

@Field(() => Int, { nullable: true, description: 'Rows to skip (pagination offset).' })
offset?: number | null;
```

**Verify**: `pnpm nx run openthrottle-server:typecheck` → exit 0.

### Step 2: Apply the ceiling + `take`/`skip` in each resolver

At the top of each resolver module define shared constants (mirror `plans.resolver.ts`):

```ts
const DEFAULT_LIST_LIMIT = 1000;
const MAX_LIST_LIMIT = 1000;
```

In each of the three list methods, clamp and apply:

```ts
const take = Math.min(
  Math.max(1, input.limit ?? DEFAULT_LIST_LIMIT),
  MAX_LIST_LIMIT,
);
const skip = Math.max(0, input.offset ?? 0);
const entities = await service.getRepository().find({
  order: { createdAt: 'ASC' },
  where: {
    /* unchanged */
  },
  take,
  skip,
});
```

Keep the existing `where`/`order` exactly as-is.

**Verify**: `pnpm nx run openthrottle-server:typecheck` → exit 0.

### Step 3: Tests

For each of the three folders, add/extend `*.resolver.test.ts` (model after an existing resolver test in the repo, e.g. `plans.resolver.test.ts`) covering: default cap applied when no `limit` (asserts `find` called with `take: 1000`); explicit `limit`/`offset` passed through; `limit` above `MAX_LIST_LIMIT` clamped to the max; negative/zero `limit` clamped to `>= 1`.

**Verify**: `pnpm nx run openthrottle-server:test -- plan-embeddings task-embeddings plan-output-stream` → new tests pass.

### Step 4: Regenerate schema + consumer codegen

The three new args change the schema. Regenerate the app copy and consumer outputs:

1. Boot the server (`pnpm nx run openthrottle-server:dev`), wait for the running banner, stop it. This rewrites `applications/openthrottle-server/schema.gql` with the new args.
2. `pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel`.

**Verify**:

- `git diff applications/openthrottle-server/schema.gql` shows ONLY additive new args on the three queries (no removed/changed existing fields).
- Codegen command exits 0.

### Step 5: Full gates

**Verify**:

- `pnpm nx run openthrottle-server:lint` → exit 0
- `pnpm nx run openthrottle-server:test` → all pass
- `pnpm nx run openthrottle-server:build` → exit 0

## Test plan

- New/extended resolver tests as in Step 3 (default cap, explicit paging, clamp-high, clamp-low) for all three queries.
- Schema diff is additive-only (guards against an accidental breaking change).

## Done criteria

ALL must hold:

- [ ] The three list resolvers pass `take`/`skip` with a clamped ceiling; no bare unbounded `.find` remains for them
- [ ] `grep -n "MAX_LIST_LIMIT\|take" ` shows the cap in all three resolver files
- [ ] `pnpm nx run openthrottle-server:typecheck` exits 0
- [ ] `pnpm nx run openthrottle-server:test` exits 0 (new tests included)
- [ ] `applications/openthrottle-server/schema.gql` regenerated; diff is additive-only; consumer codegen ran
- [ ] `pnpm nx run openthrottle-server:build` exits 0
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:

- The schema diff removes or changes any EXISTING field/arg (must be additive-only) — a breaking change needs a deprecation plan, not this.
- Booting the server to regenerate the schema is not possible in the executor environment (no DB/Redis) — report; the code change can still land but the schema/codegen regen must be done where the server can boot.
- A resolver's current `.find` shape differs from the "Current state" excerpt (drift).

## Maintenance notes

- **Ordering with plan 006**: if plan 006 (root `schema.gql` retirement) is in the same PR, do THIS plan's schema regeneration first, then 006 — so the final single app `schema.gql` already contains these args.
- Reviewer: confirm the schema change is additive; confirm the default ceiling (1000) is acceptable for the largest real plans, and that the ASC-order truncation semantics (oldest-first) are understood — if clients need the _newest_ N chunks, a follow-up may add descending order or a `latest` variant.
- If the frontends need true cursor pagination later, revisit these to add keyset pagination rather than offset (offset degrades on large tables).
