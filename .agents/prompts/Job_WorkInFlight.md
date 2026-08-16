# Work in flight

Reconcile git, GitHub, and OpenThrottle so finished work stops rotting — unmerged pull requests, stale branches and worktrees, stranded plans, and missing ledger entries — then file the findings as a single OpenThrottle plan.

## Cadence

Daily. This job exists because of a chronic, well-documented failure mode in this repo: work gets completed, committed, and marked DONE, and then the pull request is never merged, or the plan is left `IN_PROGRESS` with every task closed. Nothing in the system reconciles that on its own, so the only defense is a short feedback loop. A day-old stranded plan is a two-minute fix; a month-old one is an investigation.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only). Plans and tasks live in OpenThrottle (OT), reached through the `openthrottle-mcp` MCP server.

Commands this job uses:

```bash
gh pr list --state open --json number,title,headRefName,createdAt,isDraft,mergeable,statusCheckRollup,reviewDecision
gh pr view <number> --json state,mergedAt,mergeCommit
git branch -vv                             # local branches and their upstreams
git worktree list                          # active worktrees
git log origin/main..<branch> --oneline    # unmerged commits on a branch
git log <branch>..origin/main --oneline    # how far behind a branch is
git log origin/main --since='14 days ago' --oneline   # recent squashes to reconcile against the ledger
```

OT tools this job uses: `list_plans_by_status`, `get_plan`, `get_tasks_by_plan_id`, `get_remaining_tasks_for_plan`, `semantic_search`, `create_plan`, `create_tasks`.

Facts that change the analysis:

- **There are two git remotes.** `origin` is `OpenThrottle/monorepo` — the canonical repository, and the only one this job reasons about. A separate public mirror exists with **unrelated history**; never cross-reference the two, and never treat a mirror branch as evidence of anything.
- **There is no server-side downward reconcile in OT, in either direction.** A plan can read `COMPLETED` while its tasks are still `IN_PROGRESS`, and a plan can sit `IN_PROGRESS` forever with every task `COMPLETED`. Both are real states in this database and both are findings.
- The work ledger records a **merged squash** — `attach_session_subject({ planId, taskId? })` followed by `record_artifact({ type: 'git_commit', payload: { repo, sha } })`, or `pnpm exec workflow-link-merge`. One artifact per merged commit, never per intermediate work commit. Per-task work commits carry traceability through their `Plan-Id:` / `Task-Id:` footers instead, so a work commit with no artifact is **correct**, not a finding.
- Loop and Ralph runs live in dedicated worktrees (typically `loop-plan-*` under a sibling worktrees directory). A worktree whose branch has merged is finished and should be reported for teardown — by a human, not by this job.
- A session worktree can be reaped mid-run, so unpushed commits are genuinely at risk of loss. Rank them accordingly.
- Never push to `main`; the repo also forbids `--no-verify` and bypassing Husky hooks. This job does not write to git at all, but findings must not recommend those either.

## What to inspect

1. **Open pull requests.** For each: age, draft state, CI status, mergeability (conflicts), and review decision. Call out the ones that are green, non-draft, unblocked, and simply waiting — those are the cheapest wins on the board. Separately flag PRs that are red or conflicted and have gone quiet.
2. **Local branches and worktrees.** Branches with commits not present on `origin` (unpushed work — at risk); branches with no corresponding pull request; branches already merged into `origin/main` that still exist locally; worktrees whose branch has merged; worktrees with uncommitted changes.
3. **Plans marked done whose work never landed.** OT plans in `COMPLETED`/`DONE` whose referenced pull request is still open, or whose branch was never pushed. This is the single most common failure in this repo — check it thoroughly, not casually.
4. **Stranded plans.** Plans `IN_PROGRESS` where every task is `COMPLETED` (nothing will ever close them), and the mirror case: plans marked `COMPLETED` with tasks still `IN_PROGRESS`, `PENDING`, or `QUEUED`.
5. **Missing ledger entries.** Squash commits merged to `origin/main` in the last two weeks that carry a `Plan-Id:` footer but have no corresponding `git_commit` artifact on the work ledger. Ignore intermediate work commits — only merged squashes are supposed to have artifacts.
6. **Orphaned tasks.** Tasks `IN_PROGRESS` on a plan with no active work anywhere — no branch, no worktree, no recent commits.

## Ranking

Order findings by the risk that the work is lost or forgotten:

1. **Unpushed commits** — the only category where work can actually disappear (a worktree can be reaped).
2. Merged work with no ledger artifact — traceability lost while the memory of it is still fresh.
3. Plans marked done whose pull request never merged — the work exists but is not in the product.
4. Green, unblocked, waiting pull requests — one click from done.
5. Stranded `IN_PROGRESS` plans and orphaned tasks — a bookkeeping problem that makes every future status query lie.
6. Merged branches and finished worktrees still on disk — pure cleanup.

Cap the run at **20 findings**. This job is a checklist, so favor completeness over brevity — but if you exceed 20, keep the top 20 and say in the plan description how many you dropped.

## Hard rules

- **Read-only on git and on GitHub.** Never push, never merge, never rebase, never force-push, never delete a branch, never remove a worktree, never comment on or close a pull request. `gh` is used with read-only subcommands only.
- **Read-only on OT state.** Never change a plan's or a task's status, even one that is obviously stranded — reporting it is the job. The only OT writes this job makes are the one `create_plan` and its `create_tasks`.
- **Never record a work-ledger artifact yourself.** A missing artifact is reported as a finding; a human or the merging session records it.
- **Read-only on source code.** Never edit, fix, or refactor anything.
- Never write a plan or task as a Markdown file anywhere — plans and tasks live in OpenThrottle only.
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- Do not run destructive or stateful commands (no migrations, no `database:reset`, no installs). `git fetch` is allowed to get accurate remote state; nothing else that writes.
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything, check what already exists:

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS` plans — this job runs daily and files plans titled `🔁 Work in flight: …`, so yesterday's plan will almost always exist. Read it.
- `semantic_search` on each finding's subject (the branch, pull request number, or plan id) to catch a plan filed by a human or another job.

Then:

- **Prefer amending yesterday's plan over filing a new one.** If a plan from this job is still open, add only genuinely new findings to it (`create_tasks`) and file no new plan. A daily job that opens a new plan every day is itself the problem it was built to prevent.
- If a finding from a previous run has since been resolved, say so in your final message; do not close its task yourself.
- Only open a new plan when no plan from this job is currently open.

## Output

Exactly one `create_plan` (or, per the dedupe rule above, one `create_tasks` batch appended to the open plan from a previous run):

- **Title:** `🔁 Work in flight: <YYYY-MM-DD>` (today's date).
- **Author / assignee:** `visormatt`.
- **Category:** `tooling`.
- **Description:** the reconciliation summary — counts of open pull requests, unpushed branches, live worktrees, stranded plans, and missing ledger entries — plus anything dropped by the cap or skipped as a duplicate.
- **Tasks:** one per finding, ordered by the ranking above, each fully self-contained:
  - the branch name, pull request number and URL, worktree path, or plan/task id,
  - what state it is in and what state it should be in,
  - the exact remediation command or MCP call a human should run,
  - explicit acceptance criteria.

If everything reconciles, **file nothing** and say so plainly in your final message. A clean board is the goal, and an empty run is the best possible outcome for this job.
