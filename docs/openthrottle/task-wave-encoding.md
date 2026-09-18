# Task wave encoding

How a plan says that two of its tasks may run at the same time. The encoding is a nullable
`tasks.wave` integer: a coarse layer, not a dependency graph.

Decided for OT plan `c22e5ba1` task 2 (`68b58143`) and shipped by task 3 of the same plan: migration
`126_add_wave_to_tasks.sql`, the entity field, and the GraphQL/MCP surface. **Nothing consumes the
column yet** — it makes a plan's concurrency describable, not parallel. This page is the contract
that implementation follows; everything below about `sortOrder`, migration `049` and `task_tags`
describes the schema as it is today (verified 2026-09-18).

## The decision

```sql
ALTER TABLE tasks ADD COLUMN wave INTEGER;
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_wave_positive CHECK (wave IS NULL OR wave >= 1);
```

- **Nullable, and NULL means _unassigned_ — never wave zero.** The `>= 1` CHECK exists to make that
  unambiguous at the schema level rather than in prose: there is no wave `0` to confuse with "no
  wave". Waves number densely from `1`.
- **No UNIQUE constraint.** Several tasks sharing a wave is the entire point, and the existing
  `UNIQUE (plan_id, sort_order)` (migration `049`) is untouched.
- **A wave is a permission, not an instruction.** "These tasks _may_ be worked concurrently" — the
  executor still decides whether to, and on what evidence. See [Waves do not by themselves grant
  concurrency](#waves-do-not-by-themselves-grant-concurrency).
- **Dense, not gap-based.** Unlike `sortOrder`'s 1000-wide strides, waves go `1, 2, 3, …` with no
  reserved gaps. Gaps buy mid-list inserts without renumbering, and that pressure does not exist
  here: `wave` has no uniqueness constraint, a plan holds a handful of waves rather than dozens, and
  renumbering them is one plan-scoped `UPDATE`.

## Why a layer and not a DAG

The expressiveness of option B (`tasks.depends_on UUID[]`) has nowhere to go, because of two
constraints that already hold in the executor:

1. **One worktree per plan, reused across runs** —
   [plan-run-worktrees.md](./plan-run-worktrees.md) § Decisions. Parallel tasks in a plan share a
   single checkout; they are not isolated from each other.
2. **Validation is serialized in the parent.** Concurrent `nx` targets in the same checkout contend
   on the shared `.nx` cache and produce spurious failures — the `ot-loop` skill's
   [intra-task fan-out](../../skills/ot-loop/SKILL.md) rules already forbid a fan-out agent from
   running any `nx` target for this reason, and run `lint`/`typecheck`/`test` one at a time in the
   parent once the fan-out rejoins.

So however the concurrency is expressed, execution has the same shape: open a group, let several
agents write disjoint files, **join**, then validate and commit serially. Execution stops at a
barrier regardless. A DAG that tells you task 7 was blocked specifically by task 4 rather than by
task 4's whole layer changes nothing the executor can act on — it still cannot start task 7 before
the barrier, because the barrier is where validation happens. The extra edges are precision the
runtime has no way to spend.

That is the trade being made deliberately: **an expressive DAG nobody populates is worse than a
coarse wave everybody does.** A wave is one integer an author can assign while writing the plan;
`depends_on` asks the same author to name UUIDs of tasks that, in the `create_tasks` batch path,
**do not have ids yet** — the batch is created atomically in one transaction, so every dependency
edge inside a new plan would need a second pass of `update_task` calls after the ids come back. That
is the cost that decides this: the field most likely to be left empty is the one that cannot be
filled in the same call that creates the tasks.

## Who populates it

| Who                                          | When                    | How                                                                  |
| -------------------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| **The authoring agent** (primary)            | At plan creation        | `wave` per item in `create_tasks` / `create_task`                    |
| **A human**                                  | Any time after          | `update_task`, or the plan detail route in `openthrottle-developer`  |
| **The `improve` skill** (upstream, indirect) | When it proposes a plan | Its "dependency ordering" output becomes waves at transcription time |
| **A server-side inference pass**             | Not in v1               | —                                                                    |

**The authoring agent, at create time, is the answer.** The instruction belongs next to the
`sortOrder` guidance it sits beside — `skills/ot-plans/SKILL.md` § Task sortOrder and
[authoring-plans-via-mcp.md](./authoring-plans-via-mcp.md) § `sortOrder` is the canonical execution
order — so an author who is already deciding order decides grouping in the same breath, in the same
`create_tasks` array. Anything that requires a second pass after creation will be skipped.

**The `improve` skill already produces the input but cannot write it.** It surfaces dependency
ordering when proposing plans ("characterization tests for module X must land before the refactor
of X"), which is exactly the raw material for a wave assignment. It writes Markdown plan files
rather than OT rows, though, so it hands that ordering to whoever transcribes the plan into OT; it
is not itself a write path for `wave`.

**No server-side inference in v1, deliberately.** Inferring waves means guessing which tasks touch
disjoint files before any of them has run, from titles and descriptions. A wrong guess here does not
produce a slow run, it produces two agents editing the same file in one checkout and one silently
losing the other's work. Inference can be added later against evidence from real runs; it should not
be the bootstrap.

## What an unpopulated plan does

**It runs strictly sequentially, exactly as today.** This is the single property the encoding must
not get wrong, so it is stated as a rule with a closed failure mode:

- **Every task's `wave` is NULL** → sequential by `sortOrder ASC, createdAt ASC`. This is today's
  behaviour, bit for bit, and it is what every plan created before the column existed will do
  forever unless someone edits it.
- **Some tasks have a wave, some are NULL** → the NULL ones are **not** a shared implicit wave and
  are **not** wave 1. Each NULL task is its own barrier: it runs alone, in `sortOrder` position.
- **Waves are not monotonic along `sortOrder`** (e.g. `1, 2, 1`) → the plan is malformed. Fail
  closed: ignore `wave` for the whole plan, run it sequentially, and say so loudly in the plan
  output. A wave group has to be contiguous in `sortOrder` to be a barrier at all.

There is no reading under which a missing or malformed wave means "everything is parallel". The
degradation is always toward the slower, safer order.

## Interaction with `sortOrder`

`sortOrder` stays exactly what it is: the canonical execution and list order, `UNIQUE (plan_id,
sort_order)`, sorted `sortOrder ASC, createdAt ASC`. `wave` does not replace it, does not relax its
unique index, and does not reorder anything.

- **Waves group a `sortOrder` sequence; they never resequence it.** The canonical list order is
  unchanged, so every display, every list tool and every existing consumer keeps working untouched.
- **`sortOrder` remains the tiebreaker _within_ a wave** — it decides display order, the order units
  are dispatched in, and the order work is committed in when a wave's members land as separate
  commits. Two tasks in one wave are still totally ordered; they are merely allowed to overlap.
- **`sortOrder` alone remains sufficient** to execute any plan. Reading `wave` is an optimization a
  driver may skip entirely; a driver that ignores the column is correct, just serial.

## Hook tasks are never waved

Lifecycle hook tasks (`hookRole` non-NULL, migration `071`) exist to bracket other work, so a hook
that overlaps what it brackets is meaningless. Hook tasks carry `wave = NULL` and always run at
their anchored position. Ralph already routes them separately —
`packages/openthrottle-agentic-ralph/src/utils/plan-task-list-order.ts` — and that routing is
unchanged.

## Waves do not by themselves grant concurrency

A shared wave is the plan's _claim_ that two tasks are independent. Before acting on it, the
executor still applies the `ot-loop` eligibility test — **disjoint file sets, and no shared
invariant** — which owns that judgment and is not restated here. Concurrency caps likewise stay in
[`skills/ot-loop/references/model-routing.json`](../../skills/ot-loop/references/model-routing.json);
this page adds no numbers of its own.

## Rejected

**Tied `sort_order` values.** Not available: migration `049` creates
`idx_tasks_plan_id_sort_order` as a UNIQUE index on `(plan_id, sort_order)`, and
[`databases/README.md` § Task sort_order](../../databases/README.md) states the same. Two tasks
cannot share a `sort_order`. Ruled out 2026-09-10; do not re-propose it.

**Option B — `tasks.depends_on UUID[]`.** A true DAG, and the most expressive option. Rejected for
the authoring cost above, and because an array column gives none of the integrity a DAG needs for
free — all of the following would have had to be designed and implemented before the first edge
could be written:

- **Cycles.** Postgres cannot reject a cycle in an array column; it needs a service-layer check on
  every `create_tasks` / `update_task` write, plus a run-start check, because a plan can be walked
  into a cycle by two individually-valid edits.
- **Deletion.** `UUID[]` has no referential integrity, so `delete_task` leaves dangling ids behind
  in every other task's array. Either deletion sweeps all sibling arrays, or the executor treats an
  unresolvable id as satisfied (silently parallelizing work that had a real dependency) or as
  blocking forever (deadlocking the plan). All three need deciding.
- **SKIPPED / CANCELED dependencies.** `SKIPPED` means "deferred, may be revisited"
  (`databases/README.md` § Status semantics) and is terminal for remaining-work purposes. A
  dependency that is skipped is neither done nor pending, so each edge needs a rule for whether it
  releases its dependents — and "skipped counts as satisfied" is exactly how a task runs before the
  work it depended on.

A wave integer has none of these questions. It cannot cycle, it cannot dangle when a task is
deleted, and a skipped member of a wave simply does not run while the barrier still closes on the
rest.

**Option C — a `task_tags` dimension (`wave-1`, `wave-2`, …).** It looks free — the table and its
MCP tools already exist — and it is not. `task_tags` constrains `dimension` to `('domain', 'phase')`
and `tag` to kebab-case (migration
[`064_create_plan_tags_and_task_tags.sql`](../../databases/migrations/064_create_plan_tags_and_task_tags.sql),
constraints `chk_task_tags_dimension` and `chk_task_tags_tag_kebab`). Shipping waves this way needs
a migration that drops and recreates `chk_task_tags_dimension` with a third value, on **both**
`task_tags` and `plan_tags` to keep the two tables' vocabularies aligned — no smaller than the
column migration it was meant to avoid. On top of that, tags are service-layer validated against the
caller's `user_skill_tags` vocabulary, so every wave label would also have to exist as a vocabulary
entry per user. And both existing dimensions are _descriptive_ — what a task is about, what stage it
is in. Execution scheduling is not that, and an ordinal smuggled into a string vocabulary
(`wave-10` sorting before `wave-2`) is a worse home for it than an integer column.

## What shipping it touches

Honest scope for task 3, so it is not discovered a layer at a time:

| Layer            | File                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration        | `databases/migrations/<next>_add_wave_to_tasks.sql` (+ `COMMENT ON COLUMN`)                                                                                                                     |
| Schema docs      | `databases/README.md` — Schema, Indexes and the migration list                                                                                                                                  |
| Entity           | `packages/nestjs-repositories/src/modules/tasks/task.entity.ts` (column **and** the `TaskData` pick), `tasks.service.ts`, `tasks.factory.ts`                                                    |
| GraphQL          | `applications/openthrottle-server/src/graphql/tasks/task.object.ts`, `task.input.ts` (`CreateTaskInput`, `CreateTasksItemInput`, `UpdateTaskInput`), `tasks.resolver.ts`                        |
| Generated schema | `applications/openthrottle-server/schema.gql` + all `__generated__` output                                                                                                                      |
| MCP              | `packages/openthrottle-mcp/src/tools/tasks.ts` — the generated zod schemas follow the GraphQL inputs automatically, but `createTasksItemSchema` is **hand-written** and must be updated by hand |
| Ralph            | `packages/openthrottle-agentic-ralph/src/utils/plan-task-list-order.ts` and `src/graphql/ralph/fragments.graphql`                                                                               |
| Workflows CLI    | `tools/workflows/src/utils/openthrottle-ralph-postgres.ts` — raw SQL with explicit column lists, which a new column does not reach on its own                                                   |
| Developer UI     | `applications/openthrottle-developer/app/routes/plans.$planId._index.tsx.graphql` and `app/routing/plans/utils/sort-plan-tasks-by-list-order.ts`                                                |

## See also

- [authoring-plans-via-mcp.md](./authoring-plans-via-mcp.md) — how plans and tasks are authored, and
  what `sortOrder` already guarantees.
- [plan-run-worktrees.md](./plan-run-worktrees.md) — one worktree per plan, which is why parallel
  tasks share a checkout.
- [`skills/ot-loop/SKILL.md`](../../skills/ot-loop/SKILL.md) — the execution loop, the disjoint
  file-set eligibility test, and why validation stays serialized.
- [`databases/README.md`](../../databases/README.md) — Task `sort_order`, status semantics, schema.
