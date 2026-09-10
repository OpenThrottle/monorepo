# Per-task model attribution

How a model identifier that **varies per task** reaches the work ledger, so that a plan executed
under per-task model routing can be read back task by task: which model did which task.

Decided for OT plan `fbd66137-3ffa-417a-829f-6d92f1249d8e` task 1. Routing _policy_ — which
category maps to which model — is a separate decision and lives elsewhere (task 3); this page is
only about the channel that makes the answer observable.

## The question

`skills/ot-loop/SKILL.md` runs one task per iteration and may run different tasks on different
models. Before routing can be justified it has to be measurable, so the ledger needs to answer:

```
for this plan, which model executed each task?
```

Today it cannot. Every interactive session records `model: null`.

## Verified state (re-confirmed 2026-09-10, on `origin/main` @ 9eb86fea)

Four facts, each checked in the tree rather than inherited from the plan text:

| Claim                                                                 | Status                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `StartWorkSessionInput.model` exists                                  | **True** — `applications/openthrottle-server/schema.gql`              |
| `current-session.ts` already passes `resolveSessionModel()`           | **True** — `packages/openthrottle-mcp/src/session/current-session.ts` |
| `resolveSessionModel` reads only `process.env.OPENTHROTTLE_MCP_MODEL` | **True** — `packages/openthrottle-mcp/src/config/client-identity.ts`  |
| Nothing in the repo sets that variable                                | **True** — grep finds only `client-identity.test.ts`                  |

So the plumbing is complete from the GraphQL input down to the column. The gap is entirely in the
**source** of the value.

Two structural problems with the current source, not one:

1. **Wrong granularity.** `OPENTHROTTLE_MCP_MODEL` is per _process_. One MCP server serves an
   entire loop, so a process-level variable cannot express a per-task decision even if it were set.
2. **Never set.** In practice the value is absent, so the column is null on every real session.

## The binding constraint: sessions are append-only

`work_sessions` is documented append-only — _"Only `ended_at`/`closed_by` mutate after creation"_
(`databases/migrations/068_create_work_ledger_tables.sql`). The GraphQL surface agrees: the schema
exposes exactly three session mutations, and none of them can change a model.

```
startWorkSession(input: StartWorkSessionInput!): WorkSessionObject!
attachWorkSessionSubject(input: AttachWorkSessionSubjectInput!): WorkSessionSubjectObject!
endWorkSession(input: EndWorkSessionInput!): WorkSessionObject
```

This single fact decides the design. **The model must be supplied at INSERT**, which means at
session open. Every "set the model on the current session" shape — a setter tool, an extra argument
on `attach_session_subject` (which runs _after_ `ensureWorkSession` has already opened one) — is
ruled out by the schema, not by taste. The only way a model can vary per task is if a **new session
opens per task**, carrying the model with it.

## Options considered

|       | Shape                                                                                  | Verdict                                                                                                                                                                                                                                                                               |
| ----- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | `model` argument on a per-task tool the loop already calls (`update_task`)             | Rejected. Conflates task state with provenance, and `update_task` is called twice per task (IN_PROGRESS, COMPLETED) so the value has no single natural home. Still needs the session to rotate anyway.                                                                                |
| **B** | Session-per-task: rotate the session at the task boundary, supplying the model at open | **Chosen.**                                                                                                                                                                                                                                                                           |
| **C** | New `tasks.model` column                                                               | Rejected. A task is a _specification_; it is re-runnable and can be executed more than once, by different models. A single column on the spec cannot hold a history, and would be overwritten on re-run. The ledger already exists to hold execution history. Also needs a migration. |
| **D** | Attribute via `plan_runs` only, accept null-by-honesty                                 | Rejected as the _whole_ answer — it is the current state, and it cannot answer the per-task question at any granularity. Retained as the honest fallback when no model is declared.                                                                                                   |

Option **B** needs **no migration and no GraphQL change**. `work_sessions.model`,
`work_session_subjects.task_id`, `attach_session_subject`, `end_session` and
`StartWorkSessionInput.model` all already exist. The only missing link is that
`ensureWorkSession()` sources its model from the environment instead of accepting an explicit one.

## Decision

**A task-scoped work session is the per-task model of record.**

At each task boundary the loop rotates the session: close the current one, open a new one whose
`model` is supplied explicitly by the caller, and attach it to `(planId, taskId)`. The read-back is
a plain join, no new schema:

```sql
SELECT wss.task_id, ws.model, ws.tool_name, ws.started_at, ws.ended_at
FROM work_session_subjects wss
JOIN work_sessions ws ON ws.id = wss.session_id
WHERE wss.plan_id = $1
  AND wss.task_id IS NOT NULL
  -- Required. Without it this returns several rows per task: the server opens its OWN session
  -- per status change (tool_name 'developer-app', model NULL, no external_ref) and attaches it
  -- to the task, so a task that went IN_PROGRESS then COMPLETED already has two sessions before
  -- the agent's. Agent sessions carry an external_ref of `<worktree>:<pid>`; capture sessions
  -- carry none. Measured on plan fbd66137: 11 capture rows against 6 real ones.
  AND ws.external_ref IS NOT NULL
ORDER BY ws.started_at;
```

**A task can have more than one session, and nothing in the schema marks which is which.** There is
no session-kind column, so the filter above is a heuristic on `external_ref` / `tool_name` rather
than a first-class discriminator. It is correct today because the server's capture path never sets
`external_ref`, but it is the weakest link in this read and worth making explicit rather than
discovering from a duplicated row count.

### What each model field holds

| Location              | Holds                                                                                                               | Granularity                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `work_sessions.model` | The model that **executed the work** of the attached task                                                           | **Per task** — the model of record |
| `plan_runs.model`     | The model of the **orchestrator** — the loop driver itself, which does selection, validation, commits and narration | Per run                            |
| `tasks`               | Nothing. No column is added.                                                                                        | —                                  |

`plan_runs.model` is deliberately _not_ redefined. Under routing a run has no single executing
model, but it does still have exactly one driver, and that is a real and useful fact. The two
columns answer different questions and neither is redundant.

### The semantic, stated precisely

`work_sessions.model` on a task-scoped session means **the model that did that task's work, as
declared by the orchestrator** — not the model that made the tool call.

This distinction is not pedantic and must not be quietly re-derived later. When the loop delegates
task work to a subagent, the subagent typically shares the parent's MCP connection; the tool calls
that open and attach the session are made by the _parent_. So the recorded value is necessarily a
**declaration**, not a detection. This is consistent with the existing rule in
`client-identity.ts`: never infer a model. A declared value can be honest; an inferred one cannot.

A corollary worth stating: when the orchestrator does a task's work itself, it declares its own
model, and the value is the same either way. The declaration is not a special case for delegation.

### Resolvable at lazy session-open time?

**Yes.** This is the requirement that rules out every alternative shape, so it is worth being
explicit about why B satisfies it.

Sessions open lazily on the first mutating tool call (`ensureWorkSession`), which is long after
`connect()` returns. Under B the model arrives as an **argument on the very call that opens the
session** — it is in hand at the moment of INSERT, by construction. There is no window in which the
session exists without its model, and no read of ambient state that might not be populated yet.

### `OPENTHROTTLE_MCP_MODEL` survives as a fallback

It is **not retired.** Precedence, highest first:

1. An explicit model supplied by the caller at session open.
2. `process.env.OPENTHROTTLE_MCP_MODEL`, trimmed, when non-empty.
3. `null`.

Retiring it would regress the paths that have no orchestrator to declare anything: a headless
driver, a queued Ralph run whose model is fixed at enqueue, or any MCP client that simply knows
what model it is running and sets the variable at launch. Those are exactly the cases the variable
was added for, and they remain correct. Keeping it costs one `??`.

Rung 3 is retained deliberately. Null means "not observable", and a review is expected to report it
as such. A wrong value in a provenance column is worse than a missing one — the whole point of the
existing design note in `client-identity.ts` — so nothing here guesses.

### Rotation must be atomic

Found while implementing this, and worth stating because the failure is silent and reports itself
as success.

MCP permits concurrent requests — the stdio server processes queued calls in parallel — and the
first implementation rotated by "close the current session, then open one lazily". Two concurrent
rotations both observed _nothing open yet_, both adopted the same in-flight lazy open, and
collapsed onto **one** session carrying **one** model for two tasks. Each caller was nonetheless
told its own model had been recorded, so the tool output and the stored row disagreed. Reporting a
provenance value that is not the stored one is worse than recording none at all.

So session rotation is serialized behind a lock, and the rotating path deliberately does **not**
reuse the lazy `ensureWorkSession` — that function's entire job is to _share_ an open, which is
exactly what must not happen when the point of opening is to record a different model. A regression
test dispatches two rotations concurrently and asserts two distinct sessions.

### Demonstrated read-back

Two tasks, two declared models, dispatched concurrently through `begin_task_session`, then read
back with the join above:

```
                      title                      | category |      model      |  tool_name
-------------------------------------------------+----------+-----------------+-------------
 FIXTURE task A — declared model claude-sonnet-5 | chore    | claude-sonnet-5 | claude-code
 FIXTURE task B — declared model claude-opus-5   | chore    | claude-opus-5   | claude-code
```

The declared model and the recorded model agree on both rows, and `tool_name` still comes from the
client handshake, so the existing client-identity split is intact.

### Invariants preserved

- **Attribution never fails a tool call.** Supplying a model is optional at every layer; a missing
  or malformed value degrades to the next rung, never to an error.
- **Never infer.** The explicit rung is a declaration by the caller. Nothing is derived from the
  handshake, the client name, or the environment beyond the one variable that exists for it.
- **The HTTP surface still reports no model.** The Nest surface multiplexes many callers over one
  process, so it continues to resolve to the static fallbacks — the same surface split
  `client-identity.ts` and `workspace-path.ts` already use.
