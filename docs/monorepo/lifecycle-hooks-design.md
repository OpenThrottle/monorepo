# Lifecycle hooks for plans & tasks (Jest-style) — unified design

> Status: **DESIGN** · Author: visormatt · Plan-Id: `1bee2916-a30d-4c84-a126-53908d00c866`
>
> Extends task-injection placement (`first|last` → `+before|after`) and promotes
> before/after into a first-class, **one-level-nested** model on **both plans and
> tasks**, yielding the full Jest surface. Validation (lint/test/typecheck or
> org-custom) is authored as a **skill** and layered onto a hook slot — never
> stored in project config, rule payload, or `runConfigJson`.

## 1. Goal & locked decisions

From the product owner (non-negotiable inputs to this design):

1. Hook execution = **materialized sibling tasks**, promoted to a first-class
   nested model — not a runtime-only wrapper.
2. Structure = `n` before + `n` after at **both** plan and task level; exactly
   **one level of nesting** (hook-tasks do not themselves carry hooks).
3. Validation commands live in a **skill** (`SKILL.md` declaring the checks),
   layered onto a hook slot (typically `afterEach`/`afterAll`).

The Jest surface falls out of that single structure:

| Jest phase   | This model                                                   |
| ------------ | ------------------------------------------------------------ |
| `beforeAll`  | plan-level **before** hook-task (parent = plan), runs once   |
| `afterAll`   | plan-level **after** hook-task (parent = plan), runs once    |
| `beforeEach` | plan-level **each-before** hook — _expanded_ onto every task |
| `afterEach`  | plan-level **each-after** hook — _expanded_ onto every task  |
| per-task     | task-level before/after hook-task (parent = task)            |

## 2. The two existing systems (what we reconcile)

### (a) tag-action `inject-task` placement — data-plane, JSONB-only

- Schema: `packages/openthrottle-skills/src/tag-action-payloads.ts:42`
  — `placement: z.enum(['first','last']).default('first')` inside a `.strict()`
  Zod object. Placement lives **only** in the JSONB `action_payload`; there is
  **no placement column**.
- Consumer: `applications/openthrottle-server/src/queues/plan-rules/inject-task.executor.ts:205-227`
  — `resolveSortOrder` does `MIN`/`MAX(sort_order) ± TASK_SORT_ORDER_GAP` with a
  **single** retry on the `UNIQUE(plan_id, sort_order)` violation. No midpoint,
  no rebalance, no anchor.
- This system **materializes** a real task (it calls `repository.save`). It is
  the natural home for `before|after` placement relative to an **anchor** task.

### (b) runtime `job-run-lifecycle-hooks` — control-plane, runtime-only

- Types: `tools/workflows/src/types/job-run-lifecycle-hooks.ts`. Already models
  the full canonical phase set (`beforeAll|beforeEach|afterAll|afterEach` + legacy
  `before_run|after_run` wire aliases), kinds (`prompt_profile` | `skill`),
  `onFailure` (`block|warn|ignore`), `conditions` (runKinds, taskCategories,
  taskStatuses, whenTaskOutcome, whenMainRunSucceeded…), per-phase/total limits
  (`MAX_JOB_RUN_HOOKS_PER_PHASE=10`, `MAX_JOB_RUN_HOOKS_TOTAL=20`), timeouts,
  and stable `order`.
- Runner: `tools/workflows/src/utils/job-run-hooks-runner.ts` executes a phase by
  spawning a Ralph iteration from the hook's prompt/skill seed.
- Storage: the plan carries `jobRunHooksJson` (a `JobRunHooksConfig`, i.e.
  `{ hooks: JobRunHookEntry[] }`) — a **runtime wrapper**. Hooks are **not**
  materialized as tasks; they exist only for the duration of a run.
- **Do not reinvent this.** It already has the failure policy, conditions, skill
  kind, and limits we need.

## 3. Core decision — materialized tasks DRIVE the runner (not superseded)

> **DECISION D1:** The materialized hook-tasks (data model, system a-style) are
> the **source of truth for hook identity, authoring, ordering, and content**.
> The existing `job-run-hooks-runner` (system b) is **retained as the execution
> engine** for `skill` / `prompt_profile` hook content. Materialized hook-tasks
> **project into** `JobRunHookEntry`s at run time; the runner executes them.
> `jobRunHooksJson` is **not** the authoring surface anymore — it becomes a
> derived/legacy read path.

Rationale:

- The locked decision (#1) says hooks are materialized tasks. That gives us
  durable identity, a GraphQL surface, developer-UI editing, traceability
  (`Task-Id` footers), and reuse of all existing task plumbing (status,
  commit-links, embeddings).
- But re-implementing failure policy, conditions, skill invocation, timeouts,
  and Ralph prompt seeding inside the executor would duplicate system (b). So we
  **bridge**: a hook-task's `hook_source`/`skill_slug` + role maps onto a
  `JobRunHookEntry` and the runner runs it. `onFailure` defaults are reused
  verbatim (`block` for before*, `warn` for after*) via
  `defaultJobRunHookOnFailure`.

Consequence: two representations, one canonical.

| Concern                    | Canonical home                                                          |
| -------------------------- | ----------------------------------------------------------------------- |
| Hook identity + ordering   | materialized `tasks` rows (`hook_role`, `parent_task_id`, `sort_order`) |
| Hook content / kind        | `hook_source` (`template`/`skill`) + `skill_slug` on the task           |
| Failure policy, conditions | reuse `job-run-lifecycle-hooks` semantics at execution                  |
| Execution                  | reuse `job-run-hooks-runner`                                            |

## 4. Data model (task 3)

Add to the `tasks` table (migration in `databases/migrations/`, next number):

| Column           | Type                                      | Meaning                               |
| ---------------- | ----------------------------------------- | ------------------------------------- |
| `parent_task_id` | `uuid NULL`, self-FK, `ON DELETE CASCADE` | anchor task for a task-level hook     |
| `hook_role`      | `text NULL` (`before`/`after`)            | NULL = regular task                   |
| `hook_scope`     | `text NULL` (`once`/`each`)               | plan-hook expansion mode (see below)  |
| `hook_source`    | `text NULL` (`template`/`skill`)          | how the hook body is produced         |
| `skill_slug`     | `text NULL`                               | kebab slug when `hook_source='skill'` |

Semantics (interpreted, D2):

- `hook_role IS NULL` → **regular task**.
- `hook_role` set **and** `parent_task_id IS NULL` → **plan-level hook**.
  - `hook_scope='once'` → beforeAll/afterAll.
  - `hook_scope='each'` → beforeEach/afterEach (expanded onto every task at run
    start — see §6).
- `hook_role` set **and** `parent_task_id` set → **task-level** before/after.

CHECK constraints:

- `hook_role IN ('before','after')` or NULL.
- `hook_scope IN ('once','each')` or NULL; `hook_scope='each'` only allowed when
  `parent_task_id IS NULL` (each-hooks are plan-scoped by definition).
- `hook_source IN ('template','skill')` or NULL; `skill_slug` NOT NULL iff
  `hook_source='skill'`.
- **One level of nesting:** a row with `hook_role` set must not be the
  `parent_task_id` of any other row (enforced in service-layer invariants; a pure
  SQL CHECK can't express this, so add a partial guard + service assertion).

Index: `idx_tasks_parent_task_id ON tasks(parent_task_id)`. `COMMENT ON COLUMN`
for each. Update `task.entity.ts` with the new columns + a self `@ManyToOne`
`parentTask` / `@OneToMany` `hookChildren`.

## 5. Ordering & adjacency (task 4)

`sort_order` stays the single ordering scalar under `UNIQUE(plan_id, sort_order)`.
Rules (D3):

- A **before** hook sorts immediately _before_ its anchor; an **after** hook
  immediately _after_. The group `before* → anchor → after*` must stay adjacent
  across reorders.
- Insertion uses **midpoint** between neighbors. When the integer gap is
  exhausted (`|hi - lo| <= 1`), **renumber the affected plan** by `TASK_SORT_ORDER_GAP`
  stride in a transaction, then insert. This generalizes today's single-retry.
- Plan-level `once` before-hooks occupy the head band (below `MIN` regular
  sort_order); `once` after-hooks the tail band (above `MAX`). This is exactly
  the current `first|last` behavior — so **placement `first`≡ plan-before-once,
  `last`≡ plan-after-once**, unifying system (a) with the new model.

## 6. `each` expansion (task 8)

At run start the Ralph executor expands every plan-level `each` hook onto each
regular task as an ephemeral task-scoped hook (materialized transiently or
projected straight into `JobRunHookEntry` with `phase=beforeEach|afterEach` and
the runner's existing per-task iteration). Reuses `conditions.taskCategories` /
`taskStatuses` to scope which tasks a beforeEach/afterEach smothers. Execution
order per task: `before[] → task → after[]`, surfaced in `plan_output_stream`.

## 7. Placement extension (task 2, near-term standalone win)

- `injectTaskActionPayloadSchema.placement` → `z.enum(['after','before','first','last'])`.
- Add `anchor` (optional): `{ taskId?: string; skillSlug?: string; titleMatch?: string }`
  — resolved to the anchor task; required when placement ∈ {before, after}.
- `resolveSortOrder(planId, placement, anchor)` computes a midpoint adjacent to
  the anchor (reusing the §5 helper) with rebalance fallback.
- Touch: Zod schema (`tag-action-payloads.ts`), MCP tool description
  (`packages/openthrottle-mcp/src/tools/tag-action-rules.ts:172`), resolver docs,
  migration 065 doc-comment. **No DB migration** for the enum (JSONB-only).
- Tests: executor placement resolution + payload parse.

## 8. Validation-as-skill (task 7)

A "validation skill" is a `SKILL.md` under `.agents/skills/` or `.cursor/skills/`
(the `JOB_RUN_HOOK_SKILL_PATH_PREFIXES`) declaring the required checks
(lint/test/typecheck or org-custom). A hook-task with `hook_source='skill'` +
`skill_slug` projects to a `JobRunHookSkill` entry (`kind='skill'`, `skillPath`);
the **existing** runner executes it. Defaults: `onFailure=block` when attached to
a before* slot, `warn` for after* — via `resolveJobRunHookOnFailure`. **No new
runner, no command storage in config.**

## 9. Open questions (recommended defaults; flag for human confirmation)

| #   | Question                                                                                         | Recommended default                                                             |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Q1  | Are `each` hooks materialized per-task rows, or projected transiently at run start?              | **Projected transiently** (avoid row explosion; keeps one-level-nesting clean). |
| Q2  | Does the legacy `jobRunHooksJson` stay writable or become read-only/derived?                     | **Read-only/derived** after cutover; keep parse for back-compat.                |
| Q3  | Should placement `first`/`last` be formally aliased to plan-once-before/after, or kept distinct? | **Aliased** (§5) so there's one ordering model.                                 |
| Q4  | Limits: reuse `MAX_JOB_RUN_HOOKS_PER_PHASE=10` / `TOTAL=20` for materialized hooks too?          | **Yes**, enforce at service layer.                                              |
| Q5  | `each` scoping — reuse `conditions.taskCategories/taskStatuses`?                                 | **Yes**, no new filter model.                                                   |

These are the items to grill before implementation lands; each has a safe default
so implementation is not blocked.

## 10. Task map

1. **This doc** (design + decision log). ✅
2. Placement `+before/after` + anchor on inject-task payload (standalone).
3. Data model: `hook_role` + `parent_task_id` (+ scope/source/skill) + migration.
4. Ordering: adjacency + midpoint/rebalance in `TasksService`.
5. Repository/service: hook CRUD + nested reads.
6. GraphQL surface: nested `beforeHooks`/`afterHooks` + attach/detach mutations.
7. Validation-as-skill bridge (reuse runner).
8. Ralph executor: `before → task → after`, `each` expansion, output stream.
9. Developer UI: nested before/after under plans and tasks.
10. Tests, docs, codegen parity.

## 11. Implementation status & deltas

As-built status (Plan-Id `1bee2916-…`). Tasks 1–7 landed complete with tests;
9 landed its presentational core; 8 and the 9-wiring are deferred for a reviewed
session (rationale below).

| #   | Status      | Notes / delta from the plan above                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ✅ done     | this doc                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2   | ✅ done     | placement `+before/after` + `anchor` on the inject-task payload; midpoint/rebalance delegated to task 4's `TasksService.allocateSortOrderBesideAnchor` (executor keeps only the inject-task-specific anchor resolution)                                                                                                                                                                                                                                                                           |
| 3   | ✅ done     | migration 071: `parent_task_id`, `hook_role`, `hook_scope`, `hook_source`, `skill_slug` + 6 CHECK constraints + index; one-level-nesting enforced in the service (SQL CHECK can't see the parent's role)                                                                                                                                                                                                                                                                                          |
| 4   | ✅ done     | `midpointBesideAnchor` / `rebalancePlanSortOrders` / `allocateSortOrderBesideAnchor` on `TasksService`; `first`≡plan-before-once, `last`≡plan-after-once band placement                                                                                                                                                                                                                                                                                                                           |
| 5   | ✅ done     | `addBeforeHook`/`addAfterHook`/`detachHook` + `getPlanHooks`/`getTaskHooks`. **Delta:** hook reads live in `TasksService`, not `PlansService` — adding `TasksService` to `PlansService` would create a Tasks↔Plans DI cycle; the Plan GraphQL field resolvers call `TasksService.getPlanHooks` directly                                                                                                                                                                                           |
| 6   | ✅ done     | `PlanObject`/`TaskObject.beforeHooks/afterHooks` field resolvers + `addHook`/`detachHook`. **Delta:** mutations are authenticated-only (Path A), matching existing task/plan CRUD — there is no `PLANS_WRITE` guard on task writes to match. Schema regen is additive (+69 lines, 0 deletions)                                                                                                                                                                                                    |
| 7   | ✅ done     | `projectHookTaskToJobRunHookEntry` (tools/workflows) projects a plan-level **skill** hook-task → `JobRunHookSkill` for the existing runner (D1). Template + task-level hooks are executed as materialized tasks (task 8), not projected. Canonical `.agents/skills/validate-plan/SKILL.md` added                                                                                                                                                                                                  |
| 8   | ⏸️ deferred | **Blocked-on-review:** `executeJobRunHooksPhase` has **zero existing call sites** — the runtime hooks runner was never wired into the Ralph iteration loop. Wiring `beforeAll/beforeEach/task/afterEach/afterAll` firing points, the orchestrator/worker split, blocking/error semantics, and `plan_output_stream` reporting is a high-blast-radius core-runtime change that should be designed + reviewed, not landed blind. Task 7's projection + task 5's reads are the inputs it will consume |
| 9   | 🟡 partial  | `HookTaskList` presentational component + tests shipped. Route wiring (extend `plans.$planId._index` + `tasks.$taskId._index` `.graphql` docs with the nested-hook fields + `addHook`/`detachHook`, regen codegen, wire loader/action, place the component) is bundled with the task-8 integration follow-up                                                                                                                                                                                      |
| 10  | ✅ done     | this section; cross-project parity verified (no schema/codegen drift)                                                                                                                                                                                                                                                                                                                                                                                                                             |

### Open questions — resolutions

Q1 (each materialization): unresolved in code; the task-8 executor will decide
transient vs materialized `each` expansion. Q2 (`jobRunHooksJson` fate): still
writable; no cutover done. Q3 (`first`/`last` aliasing): **adopted** (task 4
band placement). Q4 (limits): not yet enforced on materialized hooks — a
service-layer cap is a follow-up. Q5 (`each` scoping): deferred to task 8.

## 12. Task 8 — executor wiring design (for review, no code yet)

### The loop as it stands

`tools/workflows/src/bin/ralph.ts` `main()` is the per-run CLI (one plan run;
the orchestrator/`enqueuePlanRalphOrchestrator` only spawns these — hooks belong
here, not in the orchestrator). Its control flow today:

1. Promote plan → `IN_PROGRESS` (once, before the loop). — `ralph.ts:139`
2. `for (iteration…)`: load plan tasks, filter `remaining`
   (PENDING/QUEUED/IN_PROGRESS/BLOCKED), pick the first IN_PROGRESS else first
   QUEUED/PENDING as `taskForIteration`, set it IN_PROGRESS. — `:171-229`
3. `runIteration()` runs the agent for that task. — `:250`
4. Parse `<ralph:task-complete>` signals → mark tasks COMPLETED. — `:267+`
5. When `remaining` is empty at the top of an iteration → plan COMPLETED, exit. — `:181-193`

### Key realization

**Materialized hook-tasks already flow through this loop.** A before-hook sorts
immediately _before_ its anchor and an after-hook immediately _after_ (task 4
bands / adjacency), and the loop consumes tasks in `sort_order`. So hooks are
_already executed in the right order_ as ordinary iterations — the loop simply
isn't **hook-aware**: it can't identify a hook, doesn't run `skill` hooks through
the runner, doesn't apply `onFailure` (block/warn), and doesn't expand `each`.

This reframes task 8 from "invoke the phase runner at 5 points" to "make the
existing task loop hook-aware," which is smaller and lower-risk.

### DECISION D4 (needs sign-off) — execution model

- **Option A — hook-aware loop (recommended).** Keep hooks flowing through the
  normal `sort_order` loop. When `taskForIteration.hookRole != null`, branch:
  - `hook_source='skill'` → run via `executeJobRunHooksPhase` (project with task
    7's `projectHookTaskToJobRunHookEntry`) instead of the normal agent prompt.
  - `hook_source='template'` → run as a normal agent iteration (today's path).
  - Apply `onFailure`: a failed `block` hook (before\*) halts the run and leaves
    the anchor unstarted; a failed `warn` hook (after\*) logs + continues.
  - Tag the `plan_output_stream` line as a hook (role/phase/slug) so consumers
    separate hook results from task results.
  - _Pros:_ minimal change, reuses ordering/adjacency, no parallel control flow.
    _Cons:_ `beforeAll`/`afterAll` "run once" semantics must be enforced by
    status (a completed once-hook isn't re-picked — already true), and `each`
    still needs expansion (below).
- **Option B — orchestrated phases.** Pull hooks OUT of task selection; call
  `executeJobRunHooksPhase` explicitly at the 5 firing points (beforeAll before
  the loop; beforeEach/afterEach around each non-hook task; afterAll at
  completion). _Pros:_ matches the runner's existing phase model 1:1.
  _Cons:_ duplicates ordering, needs a second control path, and makes the
  materialized rows partly cosmetic — contradicting D1's "materialized tasks are
  the source of truth."

**Recommendation: Option A.** It honors D1 (materialized tasks drive execution)
and is the smaller runtime change.

### `each` expansion (Q1/Q5)

At run start, for each plan-level `each` hook, either (i) materialize a
transient per-task hook row adjacent to every regular task, or (ii) keep it
virtual and, in the hook-aware loop, run the `each` skill/template around each
regular task without a row. **Recommend (ii) virtual** — avoids row explosion
and keeps the one-level-nesting invariant clean; `conditions.taskCategories/
taskStatuses` (already on the runner) scope which tasks an `each` smothers.

### Firing points (Option A, concrete)

| Point                          | Where in `ralph.ts`                                                            | Fires                                           |
| ------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------- |
| beforeAll                      | after `:139` plan→IN_PROGRESS, before the loop                                 | plan once-before skill/template hooks, in order |
| beforeEach                     | inside the loop, before `runIteration`, when the picked task is a regular task | plan each-before hooks (virtual)                |
| task / task-level before,after | natural — they're rows in `sort_order` around the anchor                       | —                                               |
| afterEach                      | after a regular task is marked COMPLETED (`:267+`)                             | plan each-after hooks (virtual)                 |
| afterAll                       | at the empty-`remaining` completion branch (`:181-193`), before plan→COMPLETED | plan once-after hooks                           |

### Blocking / error semantics

Reuse `resolveJobRunHookOnFailure`: `block` (before\*) on failure → stop the run,
leave the anchor task un-started, surface the failure; `warn` (after\*) on
failure → record + continue. A blocked before-hook must NOT mark its anchor
COMPLETED.

### Test plan

Unit: hook-aware task selection (skill vs template branch), onFailure block halts
/ warn continues, `each` virtual expansion honoring conditions, output-stream
tagging. Integration/dry-run: a plan with a beforeAll skill hook + a per-task
after hook + an each afterEach, asserting execution order and plan_output_stream
separation.

### Open items for sign-off

1. Confirm **Option A** (hook-aware loop) over B.
2. Confirm **virtual `each`** over materialized-per-task.
3. `block` failure blast radius: halt the whole run, or just skip the anchor and
   continue to the next independent task? (Recommend halt — matches CI gates.)
4. Does `afterAll` run on a failed/aborted run, or only clean completion?
   (Runner already models `whenPlanRunSucceeded`; wire it through.)
