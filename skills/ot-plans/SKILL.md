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

## Retrieval gotchas

- **"What did I work on yesterday / last 7 days"** → `get_activity_by_date`, taking either `date`
  (`YYYY-MM-DD`) for one day or `daysBack` (1–365) for a window.
- **"The backlog" means `PENDING`** — default `list_plans_by_status` to it when no status is named.

## Authoring vs running

Infer `author` and `category` from context when absent, and confirm a provided `category` actually
fits. Report created ids so the user can act on them.

**Never start executing a plan or task unless explicitly told to** — authoring and running are
separate requests. The per-task discipline, when you are told to run one, is canonical in
[`ot-loop`](../ot-loop/SKILL.md) § The loop; do not restate it here.

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
