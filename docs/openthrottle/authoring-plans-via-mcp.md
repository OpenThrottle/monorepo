# Authoring OpenThrottle plans & tasks from your editor/agent (via MCP)

How to turn an idea into structured, executable work in **OpenThrottle (OT)** — from Cursor, Claude Code, or any MCP-capable editor or agent — using the `openthrottle-mcp` server. You author **plans** and **tasks** that land as rows in OT's database, then queue and execute them (Ralph / `workflow-ralph`) with full git traceability.

> **Scope:** the mental model and the authoring loop (idea → plan → tasks → queue → commit → link). This guide does **not** re-document MCP registration mechanics — for that see [mcp-registration.md](./mcp-registration.md). The [`ot-plans` skill](../../.agents/skills/ot-plans/SKILL.md) is the canonical tool/traceability reference; this guide aligns with it and cross-links rather than diverging.

> **Hard rule — OT only, fail loudly.** Plans and tasks live in OpenThrottle **only**. Never write a plan or task as a Markdown file under `docs/` (or anywhere else). If `openthrottle-mcp` is unavailable, or `create_plan` / `create_task` fails, **report the error** — do not silently fall back to a `.md` file or skip. (Source of truth: [CLAUDE.md](../../CLAUDE.md), [AGENTS.md § OpenThrottle](../../AGENTS.md), and the MCP server's own instructions.)

## Contents

- [Who this is for](#who-this-is-for)
- [OpenThrottle is DB-backed PM software](#openthrottle-is-db-backed-pm-software) — the mental model
- [Connect your editor/agent to OT](#connect-your-editoragent-to-ot) — get oriented, then link the registration docs
- [Author plans & tasks via MCP tools](#author-plans--tasks-via-mcp-tools) — copy-pasteable tool usage
- [Queue, execute & trace](#queue-execute--trace) — Ralph, output stream, Plan-Id/Task-Id, work-ledger commit recording
- [End-to-end worked example](#end-to-end-worked-example) — the whole loop in one narrative
- [See also](#see-also)

## Who this is for

Anyone who plans work in this monorepo from an AI editor or agent and wants that plan to be **real, queryable, executable state** — not a scratch file. If your editor speaks MCP, you can drive OT the same way regardless of vendor. The examples use tool names as they are exposed by `openthrottle-mcp`; the exact call syntax is whatever your client uses to invoke an MCP tool.

## OpenThrottle is DB-backed PM software

OpenThrottle is **project-management software backed by Postgres** (+ pgvector for semantic search). The `openthrottle-mcp` server is a thin, **GraphQL-only** boundary to `openthrottle-server`; every tool call you make is a query or mutation against real database rows.

The consequence worth internalizing: **plans and tasks are first-class rows, not documents.** A plan is not a Markdown file you write and commit — it is a row in `plans` with an `id` (UUID), and its tasks are rows in `tasks` that reference it. You create, read, and mutate them through tools, and you retrieve their content back the same way. (Schema details: [databases/README.md](../../databases/README.md).)

### Plans → tasks

- A **plan** is the unit of intent: a titled body of work with an `author`, `category`, `description`, optional `summary`, and a `status`. It gets a UUID on creation.
- A **task** is a unit of executable work belonging to exactly one plan (`plan_id` FK). Tasks carry their own `title`, `description`, `category`, `status`, `requirements`, optional `summary`, and a `sortOrder`.
- One plan has many tasks; a task never floats free of a plan.

### `sortOrder` is the canonical execution order

Tasks within a plan are sequenced by **`sortOrder`** (DB column `sort_order`, `INTEGER NOT NULL`), enforced unique per plan (`UNIQUE (plan_id, sort_order)`). This is not a cosmetic display order — it is the order Ralph, prompt injection, and every MCP list tool use to walk the plan.

- **Canonical sort:** `sortOrder ASC`, then `createdAt ASC` as a tiebreaker only.
- **Auto-assign on create:** omit `sortOrder` and OT appends `MAX(sort_order) + 1000` (first task → `1000`, next → `2000`, …). Batch creates preserve array order.
- **Re-sequence with the right tool:** use `reorder_plan_tasks` to renumber; never delete-and-recreate to reorder. Gaps (the `1000` stride) leave room for `update_task`'s gap-based inserts (e.g. `1500` between `1000` and `2000`).

### Status lifecycle

Both plans and tasks carry a `status` from a fixed enum. The canonical statuses are **`BACKLOG`**, **`BLOCKED`**, **`CANCELED`**, **`COMPLETED`**, **`IN_PROGRESS`**, **`PENDING`**, **`SKIPPED`** (plus **`QUEUED`** for plans only — set when a Run-plan job is enqueued in BullMQ until the worker picks it up).

The everyday task path is:

```text
PENDING ──▶ IN_PROGRESS ──▶ COMPLETED
                 │
                 ├──▶ BLOCKED   (waiting on something; record why in summary)
                 └──▶ SKIPPED / CANCELED
```

- You **drive lifecycle by updating `status`** (via `update_task` / `update_plan`), not by recreating rows.
- Transitioning into `COMPLETED` stamps `completed_at`; leaving `COMPLETED` clears it.
- "Remaining work" (e.g. `get_remaining_tasks_for_plan`) means any status that is **not** `COMPLETED`, `SKIPPED`, or `CANCELED`.

### From authored to executable

Because a plan is live state, authoring it is the same act as making it runnable. Once a plan has ordered tasks, it can be **queued and executed** by the Ralph tooling (`workflow-ralph`), which walks tasks in `sortOrder`, does the work, and narrates progress back into the plan's output stream. Authoring well — clear task boundaries, correct order, precise descriptions — is what makes an autonomous run go smoothly. See [Queue, execute & trace](#queue-execute--trace).

## Connect your editor/agent to OT

Any MCP-capable client can drive OT by registering **one** server: `openthrottle-mcp`. It is the single OT-native (Tier 1) server — everything else in the repo's MCP configs (github, shadcn, nx-mcp, maestro, fetch) is optional and user-provided. Whichever editor you use, the tools and this guide are identical; only the config file differs:

| Editor             | Where its MCP config lives                                   |
| ------------------ | ------------------------------------------------------------ |
| **Cursor**         | `.cursor/mcp.json` (copy from `.cursor/mcp.json`)            |
| **Claude Code**    | `.mcp.json` (committed; already includes `openthrottle-mcp`) |
| **VS Code**        | `.vscode/mcp.json` (register it yourself)                    |
| **Any MCP client** | point it at `bash scripts/run-openthrottle-mcp.sh`           |

**The full registration story is not repeated here.** For config locations, the launcher, editor parity, auth tokens, and secondary-workspace setup, read:

- [mcp-registration.md](./mcp-registration.md) — the canonical, single-source-of-truth registration guide (tiers, config locations, template, editor parity, user-provided servers, smoke-test checklist).
- [mcp-registration.md § Worktrees](./mcp-registration.md#worktrees) — worktree-aware identity and how the launcher resolves a **live** server URL (why you can hit "fetch failed" in a worktree, and how it's avoided).

### The one field that trips people up: author/assignee = GitHub username

Plan/task `author` and `assignee` expect a **GitHub username** (e.g. `visormatt`), never a display name (e.g. `Matt`). When the `GITHUB_USER` environment variable is set, the MCP server uses it automatically for these fields on create/update — so set it once and forget it. Everything else (timestamps, IDs) is handled by the database.

### Is it working?

Before authoring anything, confirm the server is live and reachable with the **`health`** tool — it returns a tiny payload and doesn't depend on the knowledge base being populated:

- **`health`** → expect all checks `ok`. This proves your client reached `openthrottle-mcp` and it reached `openthrottle-server`.

If `health` fails or the OT tools never registered, it's a registration/connectivity problem, not an authoring one — go back to [mcp-registration.md § Smoke-test checklist](./mcp-registration.md#smoke-test-checklist) and [mcp-registration.md § Worktrees](./mcp-registration.md#worktrees). Per the hard rule, **do not** work around it by writing a plan to a Markdown file; fix the connection or report the failure.

## Author plans & tasks via MCP tools

This section is a task-focused summary of the authoring tools. The [`ot-plans` skill](../../.agents/skills/ot-plans/SKILL.md) is the **canonical** reference for the full tool list and traceability rules — this guide aligns with it. Field names below are the GraphQL/MCP names (e.g. `sortOrder`, `projectId`); argument blocks are illustrative, not literal client syntax.

### Create a plan — `create_plan`

Records one plan and returns its `id` (UUID).

- **Required:** `title`, `author` (GitHub username), `category`.
- **Optional:** `description`, `summary`, `status` (defaults to `PENDING`), `assignee` (GitHub username), `project` / `projectId`, `runConfigJson`, `workspacePath`.

```jsonc
create_plan({
  "title": "Add rate limiting to the public API",
  "author": "visormatt",
  "category": "backend",
  "description": "Protect public GraphQL endpoints with a per-IP token bucket…",
  "summary": "Token-bucket rate limiting on public API; config + tests + docs."
})
// → { "plan": { "id": "…uuid…", "status": "PENDING", … } }
```

#### The plan remembers the workspace it was created in

You almost always create a plan from inside the checkout the run belongs to — your editor launched
the MCP server there. OT captures that fact so you don't have to re-supply it: `02. Workspace` on
the plan-detail Configuration tab opens **pre-selected** on that checkout, with the branch
pre-filled from its current branch, instead of defaulting to "Monorepo root (default)".

On **stdio** the folder you are working in is sent as `workspacePath` automatically. You do not
pass it.

**This is not an OpenThrottle-only feature.** The chain is
_folder you created from_ → _your registered checkouts_ → `runConfigJson.workspace.repositoryId`,
and every registered checkout is a first-class citizen of it. A plan written in the OpenThrottle
monorepo links to the OpenThrottle repository; a plan written in some other repo you have registered
links to **that** repository. Nothing about the rule prefers this checkout — the earlier bug that
made it look that way is described below.

> **`project` is not the link.** Setting `project: "native-apps"` labels a plan; it does not
> associate it with a repository. The association lives in `runConfigJson.workspace.repositoryId`
> (plus `checkoutId`), and `workspacePath` is how you get one without hand-writing run config. The
> two fields are unrelated — see [§ When to set `project`/`projectId`](#author-plans--tasks-via-mcp-tools).

**Where the path comes from.** The MCP client spawns `scripts/run-openthrottle-mcp.sh` with the open
workspace as its cwd. That launcher then has to `chdir` into this checkout to resolve `tsx` and the
built MCP bundle — a **runtime** requirement that has nothing to do with where the plan was written.
It therefore reads the caller's cwd _before_ the `chdir` and forwards it as
`OPENTHROTTLE_MCP_WORKSPACE_PATH`. Before that split existed, the server saw only the post-`chdir`
cwd, so a plan authored in any other repo was silently stamped with this checkout — and from inside
this checkout the answer was right by coincidence, which is why it went unnoticed.

**Precedence — first one that answers wins:**

1. A workspace already named in `runConfigJson` (`checkoutId`, `repositoryId` or `workingDirectory`).
2. An explicit `workspacePath` argument on the tool call. Pass `""` to opt out entirely.
3. The workspace captured at stdio startup.
4. Nothing — the plan opens on the monorepo root, exactly as before.

**It is a hint, never an authority.** Resolution happens server-side against **your own** registered
checkouts: the path is realpath-normalized, matched on path-segment boundaries (so
`/Development/openthrottle-worktrees/…` never resolves to the registered `/Development/openthrottle`),
and the **deepest** containing checkout wins — a registered worktree nested inside a registered
primary resolves to the worktree. A relative path, an unregistered directory, or a checkout
belonging to someone else simply seeds nothing.

**It never gates creation.** An unresolvable path is a debug log, not an error — the plan is created
either way.

Two caveats:

- **Cwd capture is stdio-only.** The Nest/HTTP MCP surface runs _inside_ openthrottle-server, where
  `process.cwd()` is the server's own directory. That surface sends no `workspacePath` at all.
- **Set `OPENTHROTTLE_MCP_WORKSPACE_PATH`** when your client launches the MCP server from a fixed
  directory rather than from the workspace you are actually working in. It overrides the captured
  cwd. The registration blocks printed by `pnpm run setup:mcp-instructions` declare it for you, and
  an unexpanded `${...}` placeholder is treated as unset, so a client that does not know the
  variable falls back to the cwd rather than sending the literal.

> **When to set `project`/`projectId`:** only when the plan is clearly scoped to **one** NX project. Leave it unset for cross-cutting, infra, or documentation work. Criteria: [databases/README.md § Project association](../../databases/README.md).

### Create many plans atomically — `create_plans`

Records several plans in one call — the **whole batch commits or rolls back together**. Prefer it over looping `create_plan` when you're seeding related plans.

### Create tasks — `create_task` / `create_tasks`

- **`create_task`** — one task on a plan. **Required:** `planId`, `title`. **Optional:** `description`, `category`, `status`, `requirements`, `summary`, `assignee`, `project`/`projectId`, `sortOrder`.
- **`create_tasks`** — many tasks on **one** plan, **atomically** (all or nothing). Prefer this for authoring a plan's task list in a single shot.

`sortOrder` semantics (see [the mental model](#sortorder-is-the-canonical-execution-order)): omit it to auto-append `MAX + 1000`; in a batch, tasks are appended in **array order**, so the array itself is your execution sequence.

```jsonc
create_tasks({
  "planId": "…plan-uuid…",
  "tasks": [
    { "title": "Design the token-bucket limiter", "category": "backend",
      "description": "Decide store (Redis), window, and per-IP key strategy." },
    { "title": "Implement the NestJS guard", "category": "backend",
      "description": "Add a guard that consumes the bucket and sets rate-limit headers." },
    { "title": "Add tests", "category": "backend",
      "description": "Unit + e2e for allow/deny and header correctness." },
    { "title": "Document the limits", "category": "documentation",
      "description": "Note the policy and env knobs in the API docs." }
  ]
})
// → tasks created with sortOrder 1000, 2000, 3000, 4000 in array order
```

### Re-sequence — `reorder_plan_tasks` (not delete-and-recreate)

To change execution order, pass the plan id and the task UUIDs in the order you want; OT renumbers them `1000, 2000, …` atomically. **Never** delete and recreate tasks to reorder — you lose their ids, history, and any linked commits.

```jsonc
reorder_plan_tasks({ "planId": "…plan-uuid…", "taskIds": ["…t3…", "…t1…", "…t2…", "…t4…"] })
```

For a single mid-list insert, `update_task` accepts a gap-based `sortOrder` (e.g. `1500` between `1000` and `2000`) without renumbering the rest.

### Move work through its lifecycle — `update_task`

`update_task` takes the **task `id` (UUID), not its title.** Drive the status machine by updating `status`; the same call can edit any field (`description`, `summary`, `assignee`, `sortOrder`, …). You do **not** recreate a task to change its state.

```jsonc
update_task({ "id": "…task-uuid…", "status": "IN_PROGRESS" })
// …do the work, then:
update_task({ "id": "…task-uuid…", "status": "COMPLETED",
              "summary": "Guard consumes Redis bucket; sets X-RateLimit-* headers; e2e green." })
```

Plans have the analogous `update_plan(id, …)`. Reading back: `get_plan(id)`, `get_task(id)`, `get_tasks_by_plan_id(planId)`, and `get_remaining_tasks_for_plan(planId)` — all list tools return tasks in `sortOrder ASC`, `createdAt ASC`.

## Queue, execute & trace

An authored plan is already executable. This section covers how it runs and — just as important — how the resulting git history stays tied back to the plan. Depth on the run loop itself lives in the Ralph docs; this is the authoring-guide-level view.

### Queue & execute (Ralph / `workflow-ralph`)

The Ralph tooling walks a plan's tasks in `sortOrder`, taking each `PENDING` task to `IN_PROGRESS`, doing the work, validating, and marking it `COMPLETED`. Two entry points:

- **CLI:** `pnpm exec workflow-ralph --plan <plan-uuid>` (or `--task <task-uuid>` for a single task). Run `pnpm exec workflow-ralph --help` for options.
- **Queue:** enqueue a Run-plan job (BullMQ) — the plan flips to `QUEUED` until a worker picks it up, then `IN_PROGRESS`.

For the full run loop, worker-vs-orchestrator modes, and worktree behavior, see [tools/workflows/README.md](../../tools/workflows/README.md) (there is no `workflow-ralph` skill — the loop prompt is [`agents-ralph`](../../skills/agents-ralph/SKILL.md)). Don't reproduce that here — author good tasks and let the run loop own execution.

### Narrate progress — `append_plan_output` / `get_plan_output`

A running plan has an **output stream** — an append-only log of what happened, iteration by iteration. Use `append_plan_output(planId, content, iteration?)` to record progress (Ralph does this automatically; you can too when driving a plan by hand) and `get_plan_output(planId)` to read it back for debugging or a status recap. This is narration, **not** the traceability record — commits are.

### Traceability: the two-part contract

Every bit of code that ships for a plan is traceable to it through git, in two distinct steps:

**1. Work commits carry `Plan-Id:` / `Task-Id:` footers.** Each per-task commit on your working branch uses a [conventional commit](../../skills/github-commit/SKILL.md) message with the UUIDs in the footer:

```text
feat(server): add per-IP token-bucket rate-limit guard

Consumes a Redis bucket per client IP and sets X-RateLimit-* headers.

Plan-Id: 1a2b3c4d-…-…
Task-Id: 9f8e7d6c-…-…
```

- Only conventional footers are allowed (`Plan-Id:`, `Task-Id:`, `BREAKING CHANGE:`, `Closes #123`). **Never** add `Co-authored-by` or any attribution line — this is enforced by repo convention ([CLAUDE.md](../../CLAUDE.md)).
- **Do not** record a commit artifact for these intermediate work commits.

**2. Record the _landed_ squash commit on the work ledger — after merge.** The legacy `link_commit` tool is retired; record a work-ledger `git_commit` artifact instead. `attach_session_subject(planId, taskId?)` then `record_artifact(type: "git_commit", payloadJson: {repo, sha}, message?)` associates the **squash commit on `main` after the PR merges** with the plan (and optionally a specific task) — **one artifact per task**, to what actually shipped. On a merge-queue-protected branch, `gh pr merge --auto` may only enqueue the PR; wait until `gh pr view --json mergedAt,mergeCommitSha` shows the landed commit, then use that SHA rather than the branch head. This is what keeps `get_activity_by_date` / `get_last_activity` aligned with landed work.

```jsonc
// AFTER the PR merges to main (under an open session):
attach_session_subject({ "planId": "…plan-uuid…", "taskId": "…task-uuid…" })
record_artifact({ "type": "git_commit",
                  "payloadJson": "{\"repo\":\"OpenThrottle/monorepo\",\"sha\":\"…squash-sha…\"}",
                  "message": "feat(server): add rate-limit guard (#123)" })
```

Or the one-shot CLI equivalent (orchestrates the same primitives): `pnpm exec workflow-link-merge --plan <plan-uuid> --sha <squash-sha> --repo <owner/repo>`. The SHA must be the landed default-branch commit, not the PR head SHA.

> **Why the split?** Footers give you cheap, per-commit traceability while work is in flight; the ledger `git_commit` artifact gives OT a clean record of exactly one shipped SHA per task. Recording every branch commit would pollute that record — so footers during, one ledger artifact on merge.

## End-to-end worked example

One pass through the whole loop, from a rough idea to a linked, shipped commit. Tool calls and outputs are **illustrative** — adapt them to your client and your work.

**0 — The idea.** "Our public GraphQL API has no rate limiting; a single client can hammer it. Add per-IP limits."

**1 — Create the plan.**

```jsonc
create_plan({
  "title": "Add rate limiting to the public API",
  "author": "visormatt",
  "category": "backend",
  "description": "Per-IP token-bucket limiting on public GraphQL endpoints, with config + tests + docs."
})
// → { "plan": { "id": "1a2b3c4d-0000-4000-8000-000000000001", "status": "PENDING" } }
```

**2 — Batch-create the tasks, in execution order.** The array order _is_ the order Ralph will run them.

```jsonc
create_tasks({
  "planId": "1a2b3c4d-0000-4000-8000-000000000001",
  "tasks": [
    { "title": "Design the limiter", "category": "backend",
      "description": "Redis store, window size, per-IP key strategy; write it down in the plan output." },
    { "title": "Implement the NestJS guard", "category": "backend",
      "description": "Guard consumes the bucket; set X-RateLimit-* headers; 429 on exhaustion." },
    { "title": "Tests", "category": "backend",
      "description": "Unit + e2e for allow/deny + header correctness." },
    { "title": "Document the limits", "category": "documentation",
      "description": "Policy + env knobs in the API docs." }
  ]
})
// → 4 tasks at sortOrder 1000/2000/3000/4000
```

**3 — Inspect what you authored.**

```jsonc
get_tasks_by_plan_id({ "planId": "1a2b3c4d-0000-4000-8000-000000000001" })
// → tasks in sortOrder ASC; note the 2nd task's id: 9f8e7d6c-…-…
```

**4 — Start a task.** (By hand or via `pnpm exec workflow-ralph --plan <plan-uuid>` — same state transitions either way.)

```jsonc
update_task({ "id": "9f8e7d6c-0000-4000-8000-000000000002", "status": "IN_PROGRESS" })
```

**5 — Do the work and commit with traceability footers.** On your feature branch:

```text
feat(server): add per-IP token-bucket rate-limit guard

Consumes a Redis bucket per client IP and sets X-RateLimit-* headers; 429 on exhaustion.

Plan-Id: 1a2b3c4d-0000-4000-8000-000000000001
Task-Id: 9f8e7d6c-0000-4000-8000-000000000002
```

No commit artifact yet — this is in-flight work. Optionally narrate:

```jsonc
append_plan_output({ "planId": "1a2b3c4d-0000-4000-8000-000000000001",
                     "content": "Guard implemented; headers verified locally.", "iteration": 2 })
```

**6 — Mark the task done** (with a wrap-up `summary`).

```jsonc
update_task({ "id": "9f8e7d6c-0000-4000-8000-000000000002", "status": "COMPLETED",
              "summary": "Redis token-bucket guard; X-RateLimit-* headers; 429 on exhaust; e2e green." })
```

**7 — Open a PR, get it merged.** Repeat steps 4–6 for the remaining tasks.

**8 — After the PR merges to `main`, record the landed squash commit on the work ledger** — one `git_commit` artifact per task, to the shipped SHA:

```jsonc
attach_session_subject({ "planId": "1a2b3c4d-0000-4000-8000-000000000001",
                         "taskId": "9f8e7d6c-0000-4000-8000-000000000002" })
record_artifact({ "type": "git_commit",
                  "payloadJson": "{\"repo\":\"OpenThrottle/monorepo\",\"sha\":\"abcdef1234567890\"}",
                  "message": "feat(server): add rate-limit guard (#123)" })
```

Or simply: `pnpm exec workflow-link-merge --plan 1a2b3c4d-0000-4000-8000-000000000001 --task 9f8e7d6c-0000-4000-8000-000000000002 --repo OpenThrottle/monorepo --sha abcdef1234567890`.

**9 — Close out the plan.** When every task is `COMPLETED`, set the plan to `COMPLETED` and give it a `summary` (next actions / usage notes). Now `get_last_activity` and `get_activity_by_date` show the plan's landed history, and `semantic_search` can surface it for the next person. The idea became rows, the rows became shipped code, and the code points back to the rows.

## See also

| Topic                                              | Reference                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Canonical tool + traceability reference**        | [`ot-plans` skill](../../.agents/skills/ot-plans/SKILL.md)                                                               |
| **When to use which OT tool** (rules)              | [`.agents/rules/commands/openthrottle.mdc`](../../.agents/rules/commands/openthrottle.mdc)                               |
| **Register the MCP server** (config, launcher)     | [mcp-registration.md](./mcp-registration.md)                                                                             |
| **Worktree-aware identity / live server URL**      | [mcp-registration.md § Worktrees](./mcp-registration.md#worktrees)                                                       |
| **First-time onboarding** (mental model, prompts)  | [first-time-onboarding.md](./first-time-onboarding.md)                                                                   |
| **Local server + developer app**                   | [run-openthrottle-server-developer.md](./run-openthrottle-server-developer.md)                                           |
| **MCP env, smoke checks, secondary workspace**     | [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md)                          |
| **Service-account tokens & rotation**              | [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md)                                                                  |
| **Project association** (when to set `projectId`)  | See the “When to set `project`/`projectId`” note above.                                                                  |
| **Run loop / queue** (Ralph)                       | [tools/workflows/README.md](../../tools/workflows/README.md), [`agents-ralph` skill](../../skills/agents-ralph/SKILL.md) |
| **Conventional commits & staging**                 | [`github-commit` skill](../../skills/github-commit/SKILL.md)                                                             |
| **Schema, migrations, `sort_order`, commit links** | [databases/README.md](../../databases/README.md)                                                                         |
| **Monorepo-wide agent conventions**                | [AGENTS.md § OpenThrottle](../../AGENTS.md), [CLAUDE.md](../../CLAUDE.md)                                                |
