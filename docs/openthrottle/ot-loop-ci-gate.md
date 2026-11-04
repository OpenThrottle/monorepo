# What CI signal `ot-loop` must see before it settles and tears down

`skills/ot-loop/SKILL.md` § Finishing used to run: open a draft PR → `settle_plan_run(COMPLETED)` →
destroy the worktree. Nothing in that sequence looked at CI. This page decides what it must look at,
and why that is cheap enough to be unconditional.

Decided for OT plan `40838811-e230-4c3b-a36a-04029792ddd4` task `b8c9d61b`. Cost reasoning defers to
[../monorepo/ci-cost.md](../monorepo/ci-cost.md); the CI topology itself is described in
[../monorepo/CI-quality-gates.md](../monorepo/CI-quality-gates.md).

## What happened

On plan `2027a9d4-1b2f-459e-ae2f-030f75aed2ff` (PR #554), within eleven seconds:

| time (UTC)  | event                                              |
| ----------- | -------------------------------------------------- |
| `07:17:00`  | PR #554 opened                                     |
| `07:17:04`  | CI started                                         |
| `07:17:10`  | `attribution-guard` concluded **failure**          |
| `07:17:11`  | `settle_plan_run(COMPLETED)` returned              |
| immediately | the worktree was destroyed                         |
| `07:17:20`  | `ci-success` reported `attribution-guard: failure` |

The run reported success on a red branch, wrote a `git_commit` work-ledger artifact claiming the work
had landed, and discarded the only provisioned environment that could have fixed it — all before the
rollup job had even spoken.

The ordering is what makes this expensive rather than merely inaccurate. An inaccurate status is a
row to correct. A destroyed worktree turns a one-line fix into a full re-provision: a new
`git worktree add`, a fresh `pnpm install`, a new compose project, new ports.

## The tension

"Wait for CI" is not obviously right here, because `ot-loop` leaves its PR in **draft** on purpose.
`build` and `gates` both carry `github.event.pull_request.draft == false`, so a draft PR skips the
expensive half of CI entirely, and that is the whole reason the loop pushes once at the end and marks
nothing ready. Blocking on full CI would fight that design on purpose.

But the half that _does_ run on a draft is nearly free, and it is precisely the half that caught this.

## What actually runs on a draft PR, measured

From PR #554's own check run:

| check               | runs on a draft?                                              | observed duration |
| ------------------- | ------------------------------------------------------------- | ----------------- |
| `changes`           | yes — no draft condition at all                               | 5s                |
| `attribution-guard` | yes — `if: github.event_name == 'pull_request'`, nothing more | 4s                |
| `ci-success`        | yes — `if: always()`                                          | 3s                |
| `build` (×3 shards) | **no** — `draft == false`                                     | 5m24s – 7m27s     |
| `gates`             | **no** — `draft == false`                                     | 1m58s             |

The draft-applicable set concludes in roughly twelve seconds of runner time. The loop was already
spending longer than that on the `gh pr create` call itself.

`attribution-guard` says so in its own comment, and it is the reason this is affordable:

> 💰 No Nx, no install, no cache, no full clone: a sparse depth-1 checkout of one shell file plus one
> paginated API call. Runs on draft PRs too, unlike `build` — catching this before review costs
> nothing and catching it after the squash costs an immutable commit on main.

## The decision

### 1. Which checks must report — `ci-success`, and nothing hand-listed

The loop waits for **every check GitHub reports against the head sha to reach a terminal state**, and
requires `ci-success` among them to have concluded `success`.

It does **not** maintain its own list of job names. `ci-success` already is the repo's rollup, and its
own comment names it the branch-protection target:

> Stable required-check target. Branch protection should require THIS job ("ci-success"), not a
> matrix-suffixed leg like `build (1, lint,typecheck,test)` … It reports green when the build
> succeeded OR was legitimately skipped (docs-only PR / draft), and red only when the build failed or
> was cancelled.

That is exactly the semantics wanted here and it is already draft-aware: `ci-success` demands
`success` from `changes` and `attribution-guard`, and explicitly accepts `skipped` from `build` and
`gates`. A hand-maintained list in a skill file would duplicate that logic in a second place and go
stale the first time a job is added — which is the same drift argument that keeps the attribution
pattern set in one file.

Practically this is `gh pr checks <n> --watch --fail-fast`: skipped jobs do not block it, and on a
draft PR it returns as soon as the cheap three conclude.

### 2. On red — do not settle `COMPLETED`, and do not tear down

A red branch is not completed work, so `COMPLETED` is simply the wrong value. But settling `FAILED`
the instant a check goes red throws away the thing that makes the worktree valuable while it is still
standing.

The loop gets **one** bounded repair attempt, in the worktree it still has:

1. Read the failing check's log, fix it, commit with the plan's `Plan-Id:` footer, push.
2. Wait on CI once more.
3. Green → proceed to the success path below.
4. Still red, or red for something the loop cannot fix — a flaky runner, a missing secret, an
   infrastructure failure — → settle **`FAILED`**, **leave the worktree standing**, and report the PR
   URL together with the failing check by name.

One attempt, not a retry loop. A second draft CI run costs the cheap subset again, which is
affordable; an unbounded loop is how a run burns a morning re-pushing the same broken branch.

Nothing is lost on the `FAILED` path. The branch is pushed, the PR is open in draft, the commits carry
their `Plan-Id:`/`Task-Id:` footers, and the hourly trailer harvest adopts the work from those footers
if it ever lands on `main`. What is lost is only the claim that it succeeded, which was false.

### 3. Teardown waits too — it is gated on green, not on the PR existing

This is the cheapest part of the decision and the most valuable. A standing worktree costs disk and an
idle compose project. Re-provisioning one costs minutes of install and a fresh database. The asymmetry
is not close, so teardown moves strictly behind the green signal:

> open PR → wait for CI → **green** → settle `COMPLETED` (with `headSha` + `prNumber`) → tear down.

On any non-green exit the worktree survives and the report says so, so whoever picks it up has a
provisioned environment on the right branch rather than a path that no longer exists.

The ledger follows the same gate for free: `settle_plan_run(COMPLETED, headSha, prNumber)` is what
writes the `git_commit` and `pull_request` artifacts, so gating the settle gates the artifacts. The
ledger stops recording claims the branch does not support.

### 4. Timeout — 10 minutes, and a timeout is `FAILED`, never `COMPLETED`

Ten minutes covers every draft-applicable job's own `timeout-minutes` (`changes` 5, `attribution-guard`
5, `ci-success` 2) plus runner queueing, with an order of magnitude of headroom over the ~12s these
actually take. It is short enough that a stuck run does not hold a session hostage.

On expiry the loop settles **`FAILED`**, leaves the worktree, and reports which checks were still
pending. "CI did not answer" is not evidence of success, and the whole point of this change is to stop
treating the absence of a red signal as a green one.

### The gotcha: checks do not exist the instant the PR does

`gh pr checks` against a PR seconds old reports _no checks reported on the branch_ and exits non-zero —
which reads exactly like a failure if you do not know to expect it. GitHub needs a moment to create the
check runs after `gh pr create` returns.

So the wait has two phases: poll until at least one check exists (a few seconds, inside the same
10-minute budget), then watch until they conclude. A loop that skips the first phase will report a
false failure on a perfectly green branch, which is the same class of mistake in the opposite
direction.

## What this deliberately does not change

- **The PR still opens as a draft, and the loop still does not mark it ready.** Waiting on the
  draft-applicable subset is not the same as opting into `build`. `gh pr ready` remains a human's call.
- **Still one push per plan.** The wait happens after that single push. Only the repair path in §2
  adds a second, and only once.
- **No new required check, no branch-protection change.** This reads a signal that already exists.

## Relationship to the local PR-body guard

The sibling task in this plan added `scripts/check-pr-attribution.sh`, which checks the drafted PR
title and body against the shared pattern set _before_ `gh pr create` publishes them. That guard means
the specific failure behind this plan — `attribution-guard` failing on a PR body — can no longer reach
CI at all.

The two are complementary rather than redundant. The local guard makes the known failure impossible and
costs nothing; the CI wait catches everything else, including the failures nobody has thought of yet.
Neither replaces the other: a guard only covers what it knows about, and a wait only tells you after
the fact.

## Proposed wording for `ot-loop` § Finishing

Not applied here. `skills/ot-loop/SKILL.md` and `skills/agents-ralph/SKILL.md` mirror the per-task
discipline between them, so a change to either lands through its own human-reviewed PR. This is the
text to land.

> 1. **Verify every task is closed, THEN set the plan `COMPLETED`.** _(unchanged)_
> 2. Before continuing ensure `nx run-many -t lint test typecheck format check:local` all complete,
>    flagging any errors we encounter.
> 3. To minimize friction merging with main we will run `/github-squash` to condense our PR to a
>    single commit.
> 4. Next we will fetch main `git fetch origin main:main` and rebase the branch against `main`.
> 5. **Open a Draft PR** with `/github-pull-request` — this is the single push for the whole plan.
>    Leave it in **draft**: `build` skips on draft PRs, so a draft is what keeps any later push cheap.
>    Mark it ready (`gh pr ready`) only when the work is genuinely up for review. **Capture the PR URL
>    and number, and the branch head sha.**
> 6. **Wait for CI before you claim anything.** A draft PR still runs `changes`, `attribution-guard`
>    and the `ci-success` rollup — about twelve seconds of runner time — and `ci-success` is the repo's
>    own required-check target, already written to accept `skipped` from `build` and `gates` on a
>    draft. So wait on it rather than on a list of job names you would have to maintain:
>
>    ```bash
>    gh pr checks <pr-number> --watch --fail-fast
>    ```
>
>    `gh pr checks` reports _no checks reported on the branch_ for the first few seconds after
>    `gh pr create` — poll until at least one check exists before watching. Budget **10 minutes** for
>    the whole wait.
>
>    - **Green** → continue to step 7.
>    - **Red** → you still have the worktree, which is the entire point. Take **one** repair attempt:
>      read the failing check, fix it, commit with the `Plan-Id:` footer, push, and wait once more. If
>      it is still red — or red for something you cannot fix, like a flaky runner or a missing secret —
>      stop. Settle the run `FAILED`, **leave the worktree standing**, and report the PR URL and the
>      failing check by name.
>    - **Timed out** → settle `FAILED`, leave the worktree, and report which checks were still pending.
>      CI not answering is not evidence of success.
>
> 7. **Settle your run row, with the sha and the PR number** — `settle_plan_run(planRunId, 'COMPLETED',
headSha, prNumber)`. **Only on green.** That call is what writes the `git_commit` and
>    `pull_request` ledger artifacts, so settling on red would put a claim on the ledger the branch does
>    not support.
> 8. **Stop the loop** once the PR is open and CI is green. Do **not** merge.

And in § Teardown, step 1 gains the green requirement:

> 1. **Confirm the PR is real and CI is green first.** You must have the PR URL, `git status` in the
>    worktree must show the branch up to date with its remote and nothing uncommitted, **and the CI wait
>    in § Finishing step 6 must have come back green.** If PR creation failed, anything is unpushed, or
>    CI is red or never concluded, **do not tear down** — leave the worktree intact and report, so the
>    next session inherits a provisioned environment on the right branch instead of a path that no
>    longer exists.
