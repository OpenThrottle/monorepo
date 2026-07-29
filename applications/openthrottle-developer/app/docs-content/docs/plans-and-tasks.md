---
description: Where plans and tasks live and how they stay traceable to commits.
group: 01. Concepts
order: 2
title: Plans & tasks
---

# Plans & tasks

Plans and tasks are the unit of work in OpenThrottle. The developer app is a UI over them.

## OpenThrottle is the source of truth

Plans and tasks live in **OpenThrottle (OT) only**, accessed through the `openthrottle-mcp` MCP server (which talks to the `openthrottle-server` GraphQL API). They are **never** stored as Markdown files under `docs/` or anywhere else in the repo.

- Create plans and tasks via the MCP tools (`create_plan`, `create_plans`, `create_task`, `create_tasks`). The batch variants are atomic.
- Move a task through its lifecycle by updating its `status` (e.g. `PENDING` → `IN_PROGRESS` → `COMPLETED`), not by recreating it.
- Re-sequence with `reorder_plan_tasks` rather than delete-and-recreate.
- If the MCP is unavailable, fail loudly and report the error — do not fall back to writing plan files.

Task states: `BACKLOG`, `BLOCKED`, `CANCELED`, `COMPLETED`, `IN_PROGRESS`, `PENDING`, `QUEUED`, `SKIPPED`.

## Git traceability

Commits are conventional (enforced by commitlint + Husky). When working through a plan, commit after each task and carry the traceability in the footer:

```
feat(scope): short summary

Plan-Id: <plan-uuid>
Task-Id: <task-uuid>
```

Only conventional footers are allowed (`BREAKING CHANGE:`, `Closes #123`, `Plan-Id:`, `Task-Id:`). **Never** add `Co-authored-by` or other attribution lines.

Author and assignee fields expect the **GitHub username**, not a display name.

## Ground rules

- Never push to `main`; open a PR instead.
- Never use `--no-verify` or bypass the Husky hooks.
- Require human confirmation before a rebase or force-push.

After a PR is merged, the squash commit is recorded on the work ledger (one `git_commit` artifact per merged commit) — see [Agentic workflows](/docs/agentic-workflows).
