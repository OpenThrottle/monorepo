---
name: ot-claude-loop
description: >-
  Drive one OpenThrottle plan to a PR with the built-in /loop, a task at a time
  in an isolated worktree. USE WHEN the user runs /ot-claude-loop <planId>, says
  "loop over plan <id>", or wants a plan executed autonomously. Canonical source
  of the per-task discipline.
argument-hint: <planId>
arguments:
  planId: string
disable-model-invocation: true
---

Your job is to run the built-in **`/loop`** over OpenThrottle plan **`$planId`** and its tasks — executing one task at a time, keeping status in OT in sync, appending progress to the plan output stream as you go, and opening a PR when the plan is done. This is **Ralph driven interactively via `/loop`** rather than the workflow CLI: the loop is the outer driver, but the per-task discipline is identical to the [`agents-ralph`](https://github.com/openthrottle/monorepo/blob/main/skills/agents-ralph/SKILL.md) skill.

## Setup (once, before the loop)

1. **Work in an isolated worktree on a feature branch**, never on the base checkout. Create both with `pnpm run worktree:new <name>` — the one entrypoint (name it for the plan, e.g. `feat/openthrottle-drivers`, `ot/cli-allow-list`; rename the generated branch with `git branch -m` if you want a different prefix). Runs to date have lived in dedicated `loop-plan-*` worktrees so the main checkout's server + OT MCP stay up.
2. **Load the plan and tasks** — `get_plan(planId)` + `get_tasks_by_plan_id(planId)` (or `get_remaining_tasks_for_plan`). Canonical order is `sortOrder ASC, createdAt ASC`. If tasks are out of sequence, fix with `reorder_plan_tasks` (never delete-and-recreate).
3. **Set the plan `IN_PROGRESS`** via `update_plan(planId, { status: 'IN_PROGRESS' })` if it isn't already.
4. **A fresh worktree needs codegen before app tests will collect** — run `pnpm nx run-many --target=codegen-graphql --all` if the `__generated__` output is missing.

## The loop (one task at a time)

> **This section is the canonical statement of the per-task discipline.** Change it here and
> nowhere else. One place restates it deliberately, because it is injected as a standalone
> prompt with no access to this file: [`agents-ralph`](../agents-ralph/SKILL.md) (read by the
> `workflow-ralph` CLI). Keep it in sync when you edit this. Everything else links here.

Each `/loop` iteration works exactly one task. Resume the lowest-`sortOrder` `IN_PROGRESS` task first; otherwise pick the lowest `sortOrder` `PENDING`/`QUEUED`.

> **Invariant — at most ONE task `IN_PROGRESS` at a time.** Steps 1→5 are one atomic unit: never run step 1 (`IN_PROGRESS`) for a task while another task is still `IN_PROGRESS`. Even when you power through several tasks in a single turn, fully close the current one — through **step 4 (`COMPLETED`)** — _before_ you start the next. Dropping the step-4 flip strands the task `IN_PROGRESS` even though its work shipped and was committed; there is no server-side reconcile, so it just sits there. **This is the single most common failure of this loop** — if you ever have two tasks `IN_PROGRESS`, you skipped a step 4.

1. **Start:** `update_task(taskId, { status: 'IN_PROGRESS' })`. (Precondition: no other task is `IN_PROGRESS` — see the invariant above.)
2. **Do the work** for that task, following the repo's rules (generators first, code style, no deep imports, etc.).
3. **Validate** before completing — at minimum `pnpm nx affected --target=lint,typecheck,test` for the touched projects (run targets **sequentially**, not in parallel — they share the Nx cache). Don't mark a task done on red.
4. **Complete — do this BEFORE starting any other task:** `update_task(taskId, { status: 'COMPLETED' })`. If the task genuinely can't be finished, set `BLOCKED` or `SKIPPED` instead — but never leave it `IN_PROGRESS` while you move on. Committing the work (step 5) is **not** a substitute for this flip.
5. **Commit per task** with `/github-commit` — conventional commit, with `Plan-Id:` and `Task-Id:` footers for traceability. Do **not** record a work-ledger artifact for these per-task work commits; the footers carry the traceability.
   - **💰 Commit per task, but do NOT push per task.** Let the commits accumulate locally and push **once**, when the plan is done (the PR step below does it). Every push to a branch with a ready PR triggers a full CI run, so pushing per task burns N runs validating a branch nobody is reviewing yet. One run at the end validates the whole batch — the same total validation over fewer runs. Push mid-plan only if you must hand off, exit, or the worktree is at risk of being reaped. See [ci-cost.md](../../docs/monorepo/ci-cost.md).
6. **Add tasks when the work reveals more work** (`create_tasks` appends after the plan max when `sortOrder` is omitted).
7. **Repeat** — before selecting the next task, confirm the one you just finished is `COMPLETED` (not still `IN_PROGRESS`). Continue until every task is `COMPLETED`.

**Narrate as you go.** Use `append_plan_output(planId, ...)` for decisions and progress, passing `taskId` = the task the log actually describes (omit only for genuinely plan-level notes). One iteration can touch several tasks — tag the right id.

## Finishing

1. **Verify every task is closed, THEN set the plan `COMPLETED`.** First re-fetch `get_tasks_by_plan_id(planId)` (or `get_remaining_tasks_for_plan`) and confirm **zero** tasks are `IN_PROGRESS`, `PENDING`, or `QUEUED`. Flip any stranded task to `COMPLETED` (or `BLOCKED`/`SKIPPED`) before continuing — a committed task left `IN_PROGRESS` is the usual culprit (see the loop invariant). Only once the list is clean, `update_plan(planId, { status: 'COMPLETED' })`. There is no server-side downward reconcile in **either** direction: the plan can read `COMPLETED` while tasks are still `IN_PROGRESS`, so this explicit re-fetch is mandatory — never skip it.
2. Before continuing ensure `nx run-many -t lint test typecheck format-write check:local` all complete, flagging any errors we encounter
3. To minimize friction merging with main we will run `/github-squash` to condense our PR to a single commit
4. Next we will fetch main `git fetch origin main:main` and rebase the branch against `main`
5. **Open a Draft PR** with `/github-pull-request` (conventional-commit title, the repo PR template, testing steps phrased as things to do) — this is the single push for the whole plan. Leave it in **draft**: `build` skips on draft PRs, so a draft is what keeps any later push cheap. Mark it ready (`gh pr ready`) only when the work is genuinely up for review. **Capture the PR URL** — a real PR (branch pushed to the remote, PR object created) is the precondition for teardown below.
6. **Stop the loop** once the PR is open. Do **not** merge.

## Teardown the worktree (only after a successful PR)

Once — and **only** once — the PR is confirmed open, tear down the isolated worktree. The branch now lives on the remote (via the PR), so removing the local worktree frees it to be checked out in the primary instance, letting the end-user easily pull the work for manual verification against a primary server.

1. **Confirm the PR is real first.** You must have the PR URL from the step above, and `git status` in the worktree must show the branch up to date with its remote and nothing uncommitted. If PR creation failed or anything is unpushed, **do not tear down** — leave the worktree intact and report the failure so no work is lost.
2. **Stop anything running in the worktree** — kill dev servers/watchers scoped to _this worktree's path only_. Never use a bare process-name pattern; that also kills the main checkout's server + OT MCP.
3. **Remove the worktree from the base checkout** — run from the main checkout directory (not from inside the worktree, whose cwd disappears on removal):

   ```bash
   git worktree remove <worktree-path>
   ```

   Add `--force` only if git objects to the removal _after_ you've already confirmed everything is committed and pushed. Do **not** delete the branch — both the open PR and the end-user's verification checkout depend on it. Run `git worktree prune` afterward if any stale metadata remains.

4. **Report** the PR link and note that the branch is now free to `git checkout <branch>` (or `git worktree add`) in the primary instance for manual verification.

## After merge (not part of the loop)

This loop **does not wait for merge**. It stops once the PR is open, and any later merge-queue enqueue/landing is a separate step.

Only **after the PR is actually merged**, record the squash on the work ledger — `attach_session_subject({ planId, taskId? })` then `record_artifact({ type: 'git_commit', payload: { repo, sha } })`, or run `pnpm exec workflow-link-merge --plan <id> --sha <squash-sha> --repo <owner/repo>`. On a merge-queue-protected branch, `gh pr merge --auto` can return after **queuing** the PR, so do not use the branch head SHA for this step. Wait until `gh pr view --json mergedAt,mergeCommitSha` shows the landed merge commit (or read it back from `main`), then record that SHA. One `git_commit` artifact per merged commit, never per intermediate work commit.

## Rules

- **ALWAYS** follow [openthrottle.mdc](https://github.com/openthrottle/monorepo/blob/main/.agents/rules/commands/openthrottle.mdc) and [github.mdc](https://github.com/openthrottle/monorepo/blob/main/.agents/rules/commands/github.mdc).
- Plans/tasks live in **OT only** — if the openthrottle-mcp MCP is unavailable, fail loudly; never fall back to Markdown plan files.
- Author/assignee fields expect the **GitHub username**, not a display name.
- Never push to `main`, never `--no-verify`; require confirmation before rebase/force-push.
- **One task `IN_PROGRESS` at a time.** Flip it to `COMPLETED` (or `BLOCKED`/`SKIPPED`) before starting the next, and re-fetch tasks to confirm zero `IN_PROGRESS`/`PENDING`/`QUEUED` before marking the plan `COMPLETED`. Committing the work is not the same as flipping the status.
- Task states: `BACKLOG`, `BLOCKED`, `CANCELED`, `COMPLETED`, `IN_PROGRESS`, `PENDING`, `QUEUED`, `SKIPPED`.
