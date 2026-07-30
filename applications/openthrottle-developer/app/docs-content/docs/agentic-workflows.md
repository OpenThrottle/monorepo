---
description: How the Ralph agentic loop turns a plan into committed work, one task at a time.
group: 01. Concepts
order: 3
title: Agentic workflows (Ralph)
---

# Agentic workflows (Ralph)

"Ralph" is OpenThrottle's agentic loop for executing a plan autonomously, one task at a time, with full traceability back to the plan and task.

## The loop

Starting from an idea or PRD:

1. Capture the work as an OpenThrottle **plan** and its **tasks** (see [Plans & tasks](/docs/plans-and-tasks)).
2. Work the lowest-order open task: set it `IN_PROGRESS`, do the work following the repo's rules (generators first, code style, no deep imports), then **validate**.
3. Validate before completing — at minimum `lint`, `typecheck`, and `test` for the touched projects, run **sequentially** (they share the Nx cache).
4. Mark the task `COMPLETED` and commit with `Plan-Id:` / `Task-Id:` footers.
5. Repeat until every task is complete, then open a PR.

Progress is narrated onto the plan's output stream as the loop runs, so a human can follow along.

## Where it lives

The Ralph CLI ships in `@tools/workflows` (`tools/`). Individual agentic building blocks live in the `openthrottle-agentic-*` packages under `packages/`.

## Isolation

Runs happen in an isolated git worktree on a feature branch, so the primary checkout's server and MCP stay up. The branch is pushed with the PR; the worktree is torn down only after the PR is confirmed open.

## After merge

Once the PR is merged, the squash commit is recorded on the work ledger — one `git_commit` artifact per merged commit (never per intermediate work commit). The per-task work commits carry their traceability through the `Plan-Id:` / `Task-Id:` footers instead.
