---
name: ot-plans
description: >-
  OpenThrottle plans and tasks via the openthrottle-mcp server. USE WHEN
  creating, reading or updating plans/tasks, searching the plans knowledge base,
  putting Plan-Id/Task-Id in a commit, recording a merged squash on the work
  ledger, or the user mentions OT, a plan or task UUID, or git–OT traceability.
  Plans live in OT only — never fall back to Markdown. To execute a plan see
  ot-loop.
---

# OpenThrottle plans and MCP traceability

The openthrottle-mcp instructions block and CLAUDE.md are already in context before you read this,
free and with perfect recall. **This file carries only what neither says.** "Plans live in OT only",
the atomic batch create, `update_task` takes a UUID, GitHub-username author, the `Plan-Id:` /
`Task-Id:` footers — all injected already; restating them bills every session for nothing.

Answer OT plan content from retrieved chunks, never memory. If nothing relevant comes back, say so.

## The plan remembers the workspace it was created in

On stdio, `create_plan` / `create_plans` send your working folder as `workspacePath` automatically,
in **any** registered checkout. **You do not pass it.** Chain: folder → your registered checkouts →
`runConfigJson.workspace.repositoryId`. Precedence: a workspace already in `runConfigJson` →
explicit `workspacePath` (`""` opts out) → captured cwd → nothing. Resolved server-side; never fails
plan creation.

**The free-text `project` field is a label and does NOT link a plan to a repository** — the trap
worth knowing, because setting it looks like it should.
[Detail](../../docs/openthrottle/authoring-plans-via-mcp.md#the-plan-remembers-the-workspace-it-was-created-in).

`author` / `assignee` come from `GITHUB_USER` when set — why they are already right unprompted.

## Task sortOrder (execution order)

Canonical execution and list order within a plan, `UNIQUE (plan_id, sort_order)`. Ralph, prompt
injection and every list tool sort by `sortOrder ASC, createdAt ASC`.

- **Append:** omit it — `create_tasks` assigns `MAX+1000`, `MAX+2000`, … in array order, so a batch
  keeps the order you wrote.
- **Insert mid-list:** `update_task` takes `sortOrder`; the 1000-wide gaps exist so you can land
  between two tasks without renumbering.
- **Renumber:** `reorder_plan_tasks` assigns `1000, 2000, …` in the task-id order you give.
- Schema: `databases/README.md` § Task sort_order.

## Task wave (concurrency layer) — set it while you author

`wave` is a nullable integer, `>= 1`, that groups a contiguous `sortOrder` run as the plan's claim
that those tasks **may** be worked concurrently. It is not a dependency graph, it does not reorder
anything, and nothing executes tasks in parallel from it today — see
[docs/openthrottle/task-wave-encoding.md](../../docs/openthrottle/task-wave-encoding.md).

- **Set it in the same `create_tasks` call, or it will likely never get set.** `create_tasks` is one
  atomic batch — the tasks in it have no ids yet, so there is no cheap second pass. Decide grouping
  in the same breath you decide `sortOrder`, per item in the array.
- **Same wave number = may run together.** Give independent tasks (disjoint files, no shared
  invariant) the same `wave`; give a task that must run alone its own `wave` or leave it `null`.
- **Omit it when you don't know, or when the plan is genuinely sequential.** `null` (the default) is
  always safe: it means "runs alone, in `sortOrder` position" — the same behavior every plan had
  before this field existed.
- **Never `0`.** Waves number densely from `1`.
- **Hook tasks are never waved.** Leave `wave` unset on any task you attach via `addHook` / `add_hook`.
- **Update later with `update_task`** if you didn't decide at creation time — passing `null` clears it
  back to unassigned.

## Retrieval gotchas

- **"What did I work on yesterday / last 7 days"** → `get_activity_by_date`, taking either `date`
  (`YYYY-MM-DD`) for one day or `daysBack` (1–365) for a window.
- **"The backlog" means `PENDING`** — default `list_plans_by_status` to it when no status is named.
- **`PROMOTED` is written by `promote_task`, never by hand** — "not finished here; the work continued as its own plan". It is resolved and terminal but not complete, so do not count it as delivered work. [Semantics](../../docs/openthrottle/authoring-plans-via-mcp.md#what-promoted-means).

## Authoring vs running

Infer `author` and `category` from context when absent, and confirm a provided `category` actually
fits. Report created ids so the user can act on them.

**Never start executing a plan or task unless explicitly told to** — authoring and running are
separate requests. The per-task discipline, when you are told to run one, is canonical in
[`ot-loop`](../ot-loop/SKILL.md) § The loop; do not restate it here.

## Follow-ups and session kickoff

AGENTS.md and CLAUDE.md state the rule (follow-ups are plans, kickoffs run from a plan). This is
the how.

**Filing a follow-up plan.**

- `create_plan` with `status: 'PENDING'`. The description names the **originating plan id** (if
  there is one) and the **evidence** that motivated it — the file and line, the failing output, the
  review comment. A follow-up with no evidence is a hunch, and the next session cannot check it.
- Author its tasks in **one** `create_tasks` call with `sortOrder` and `wave` decided per item (see
  § Task wave above — there is no cheap second pass).
- Tag it in the same call: `create_plan({ ..., tags: ['follow-up'] })` (or `add_plan_tag(planId,
'follow-up')` after the fact). `follow-up` is a platform system tag, accepted from any caller
  without being in your skill-tag vocabulary — do not `add_skill_tag` it (an agent token lacks
  `settings:write`). Best-effort: a tag that fails comes back in `tagFailures` and never blocks filing.
- Report the plan id. Filing is not starting: [§ Authoring vs running](#authoring-vs-running) still
  holds.

**Offering a kickoff.** When the harness lets you propose or hand off a session (a "New task" card,
a background agent, a handoff), the brief is the plan:

```
/ot-loop <planUuid>
<at most one line of context the plan does not carry>
```

Line 1 is exactly that. Everything else belongs in the plan's description and tasks, not the brief:
a prose brief that restates or replaces the plan drifts from it the moment either is edited. The
session that picks it up starts at [`ot-loop` § Setup](../ot-loop/SKILL.md#setup-once-before-the-loop)
step 1.

**What checks you.** The rule binds every tool; the checks differ by tool. Where a harness gives
the agent a tool for starting a separate session, a hook denies a brief that is not
`/ot-loop <planUuid>` — today that is only the Claude desktop app's session tools. Cursor and Codex
have no such tool (their subagents work inside the current task and are exempt), so nothing blocks
there. Under every tool, `git push` lists commits with no `Plan-Id:` footer — a warning, never a
block. Per-tool detail:
[capability matrix § Session kickoff guard](../../docs/monorepo/agent-cli-hook-capability-matrix.md#session-kickoff-guard).

**When to do it here instead.** If the follow-up acts directly on what this session just found and
nothing else is in flight here (no unfinished change, no open PR for other work), doing it in this
session is cheaper than a new one rediscovering it. It still gets a plan first — append tasks to
the current plan with `create_tasks` when it belongs there, otherwise file a new one — so its
commits carry `Plan-Id:` / `Task-Id:`.

## Work ledger

**Nothing to call.** Pass `headSha` and `prNumber` to `settle_plan_run` when the PR opens; the
server resolves `owner/repo` from the run's checkout and writes the `git_commit` and
`pull_request` artifacts itself. An hourly harvest of `Plan-Id:` trailers on each default branch
backstops a run that died before opening a PR. Two things the injected mechanics omit:

- **The artifact lands `unverified`**; the git verifier promotes it to `landed`/`verified`, and the
  activity tools align with **landed** commits. A fresh artifact not yet landed is the expected
  intermediate state, not a reason to re-record it.
- **`attach_session_subject` + `record_artifact` are the manual fallback only.** Do not reach for
  `workflow-link-merge` — it lives in the deprecated `@tools/workflows` package.

(`link_commit` and `commit_links` are retired — work-ledger epic.)

## Cross-links

- **Commits:** [`github-commit`](../github-commit/SKILL.md) · **Execution:** [`ot-loop`](../ot-loop/SKILL.md), [`agents-ralph`](../agents-ralph/SKILL.md)
- **Skill-usage telemetry:** [`docs/monorepo/skill-usage-telemetry-scope.md`](../../docs/monorepo/skill-usage-telemetry-scope.md)
- **Code style:** [`docs/monorepo/code-style.md`](../../docs/monorepo/code-style.md) · **DB / ingest:** `databases/README.md`
