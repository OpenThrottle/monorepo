---
group: 03. Agents
order: 2
title: How does the plan loop work?
---

Each pass works the lowest-order open task: set it `IN_PROGRESS`, do the work, validate (`lint`, `typecheck`, `test` for the touched projects — run sequentially since they share the Nx cache), mark it `COMPLETED`, and commit with `Plan-Id:` / `Task-Id:` footers. Runs happen in an isolated git worktree; the branch is pushed with the PR.
